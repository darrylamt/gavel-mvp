import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const MIN_TRANSACTION_GHS = 100
export const COMMISSION_RATE = 0.02
export const MIN_WITHDRAWAL_GHS = 50

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReferralRow = {
  id: string
  user_id: string
  referral_code: string
  referred_by: string | null
  is_verified: boolean
  leaderboard_display: 'name' | 'anonymous'
  total_earnings: number
  pending_earnings: number
  paid_earnings: number
  total_referrals: number
  buyer_referrals: number
  seller_referrals: number
  verified_phone: string | null
  created_at: string
}

export type ReferralCommissionRow = {
  id: string
  referrer_id: string
  referred_user_id: string
  order_id: string | null
  auction_id: string | null
  transaction_reference: string | null
  gross_amount: number
  commission_rate: number
  commission_amount: number
  status: 'pending' | 'approved' | 'paid' | 'cancelled'
  triggered_at: string
  paid_at: string | null
  created_at: string
}

export type ReferralPayoutRow = {
  id: string
  referrer_id: string
  amount: number
  period: string
  status: 'pending' | 'processing' | 'paid' | 'failed'
  paystack_transfer_code: string | null
  paid_at: string | null
  commission_ids: string[]
  created_at: string
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Ensure a referral record exists for the user, creating one if needed.
 * Safe to call multiple times — returns existing record if already present.
 */
export async function ensureReferralRecord(
  supabase: SupabaseClient,
  userId: string
): Promise<ReferralRow | null> {
  const { data: existing } = await supabase
    .from('referrals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<ReferralRow>()

  if (existing) return existing

  // Generate a unique code via the DB function
  const { data: codeData } = await supabase.rpc('generate_referral_code')
  const code = codeData as string | null
  if (!code) return null

  const { data: created, error } = await supabase
    .from('referrals')
    .insert({ user_id: userId, referral_code: code })
    .select('*')
    .single<ReferralRow>()

  if (error) {
    console.error('[referrals] Failed to create referral record:', error.message)
    return null
  }

  return created
}

/**
 * Link a new user to a referrer by referral code.
 * Called once at signup. Idempotent — skips if already linked.
 */
export async function linkReferral(
  supabase: SupabaseClient,
  newUserId: string,
  referralCode: string
): Promise<{ linked: boolean; reason?: string }> {
  if (!referralCode?.startsWith('GAV-')) {
    return { linked: false, reason: 'invalid_code_format' }
  }

  // Find the referrer
  const { data: referrerRow } = await supabase
    .from('referrals')
    .select('user_id')
    .eq('referral_code', referralCode)
    .maybeSingle<{ user_id: string }>()

  if (!referrerRow) return { linked: false, reason: 'referrer_not_found' }

  // Don't let users refer themselves
  if (referrerRow.user_id === newUserId) {
    return { linked: false, reason: 'self_referral' }
  }

  // Ensure the new user has a referral record
  const { data: existingRow } = await supabase
    .from('referrals')
    .select('referred_by')
    .eq('user_id', newUserId)
    .maybeSingle<{ referred_by: string | null }>()

  // Already linked — don't overwrite (first referrer wins)
  if (existingRow?.referred_by) return { linked: false, reason: 'already_linked' }

  // Update the new user's referrals record with referred_by (only if not already set)
  const { error: updateError } = await supabase
    .from('referrals')
    .update({ referred_by: referrerRow.user_id })
    .eq('user_id', newUserId)
    .is('referred_by', null)

  if (updateError) return { linked: false, reason: 'db_error' }

  // Get buyer/seller role to increment the right counter
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', newUserId)
    .maybeSingle<{ role: string }>()

  const isSeller = profile?.role === 'seller'

  // Increment referrer counters atomically via RPC
  await supabase.rpc('increment_referral_counters', {
    p_referrer_id: referrerRow.user_id,
    p_is_seller: isSeller,
  })

  return { linked: true }
}

/**
 * Process a referral commission for a completed transaction.
 * Safe to call multiple times — deduplicates by order_id or auction_id.
 */
export async function processReferralCommission(
  supabase: SupabaseClient,
  input: {
    buyerId: string
    grossAmountGHS: number
    orderId?: string
    auctionId?: string
    transactionReference?: string
  }
): Promise<{ created: boolean; reason?: string }> {
  const { buyerId, grossAmountGHS, orderId, auctionId, transactionReference } = input

  // Skip if below minimum transaction threshold
  if (grossAmountGHS < MIN_TRANSACTION_GHS) {
    return { created: false, reason: 'below_minimum' }
  }

  // Check for duplicate commission on the same order/auction
  if (orderId) {
    const { data: existing } = await supabase
      .from('referral_commissions')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()

    if (existing) return { created: false, reason: 'already_processed' }
  }

  if (auctionId && !orderId) {
    const { data: existing } = await supabase
      .from('referral_commissions')
      .select('id')
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (existing) return { created: false, reason: 'already_processed' }
  }

  // Check if buyer was referred
  const { data: buyerReferral } = await supabase
    .from('referrals')
    .select('referred_by')
    .eq('user_id', buyerId)
    .maybeSingle<{ referred_by: string | null }>()

  if (!buyerReferral?.referred_by) {
    return { created: false, reason: 'not_referred' }
  }

  const referrerId = buyerReferral.referred_by

  // Check if referrer is phone-verified
  const { data: referrerReferral } = await supabase
    .from('referrals')
    .select('is_verified')
    .eq('user_id', referrerId)
    .maybeSingle<{ is_verified: boolean }>()

  if (!referrerReferral?.is_verified) {
    // Commission queued — will vest when referrer verifies (set status pending, not cancelled)
    // Still create the record so it's visible and can be released later
  }

  const commissionAmount = Math.round(grossAmountGHS * COMMISSION_RATE * 100) / 100

  const { error: insertError } = await supabase
    .from('referral_commissions')
    .insert({
      referrer_id: referrerId,
      referred_user_id: buyerId,
      order_id: orderId ?? null,
      auction_id: auctionId ?? null,
      transaction_reference: transactionReference ?? null,
      gross_amount: grossAmountGHS,
      commission_rate: COMMISSION_RATE,
      commission_amount: commissionAmount,
      status: referrerReferral?.is_verified ? 'approved' : 'pending',
    })

  if (insertError) {
    console.error('[referrals] Failed to insert commission:', insertError.message)
    return { created: false, reason: 'db_error' }
  }

  // Only add to pending earnings if verified
  if (referrerReferral?.is_verified) {
    await supabase.rpc('increment_referral_pending_earnings', {
      p_referrer_id: referrerId,
      p_amount: commissionAmount,
    })
  }

  return { created: true }
}

/**
 * Get the current month period string e.g. "2026-04"
 */
export function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Get previous month period string e.g. "2026-03"
 */
export function getPreviousPeriod(): string {
  const now = new Date()
  now.setUTCDate(1)
  now.setUTCMonth(now.getUTCMonth() - 1)
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Returns start/end timestamps for a period string like "2026-04"
 */
export function getPeriodRange(period: string): { start: string; end: string } {
  const [year, month] = period.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

/**
 * Get a service-role Supabase client (for server-only use)
 */
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
