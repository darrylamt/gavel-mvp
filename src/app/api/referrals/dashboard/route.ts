import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { ensureReferralRecord, MIN_WITHDRAWAL_GHS } from '@/lib/referrals'
import { maskBidderEmail } from '@/lib/maskBidderEmail'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/referrals/dashboard
 * Returns full dashboard data for the authenticated user.
 */
export async function GET(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authData.user.id

    // Ensure record exists (create if first visit)
    const record = await ensureReferralRecord(supabase, userId)
    if (!record) {
      return NextResponse.json({ error: 'Failed to load referral data' }, { status: 500 })
    }

    // Fetch recent commissions (last 50)
    const { data: commissions } = await supabase
      .from('referral_commissions')
      .select('id, referred_user_id, gross_amount, commission_amount, status, triggered_at')
      .eq('referrer_id', userId)
      .order('triggered_at', { ascending: false })
      .limit(50)

    // Mask referred user emails
    const maskedCommissions = await Promise.all(
      (commissions ?? []).map(async (c) => {
        const { data: authUser } = await supabase.auth.admin.getUserById(c.referred_user_id)
        const email = authUser?.user?.email ?? null
        return {
          ...c,
          referred_user_masked: maskBidderEmail(email) ?? 'unknown',
        }
      })
    )

    // Fetch payout history
    const { data: payouts } = await supabase
      .from('referral_payouts')
      .select('id, amount, period, status, paid_at, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

    return NextResponse.json({
      referral_code: record.referral_code,
      referral_link: `${siteUrl}?ref=${record.referral_code}`,
      is_verified: record.is_verified,
      leaderboard_display: record.leaderboard_display,
      total_earnings: record.total_earnings,
      pending_earnings: record.pending_earnings,
      paid_earnings: record.paid_earnings,
      total_referrals: record.total_referrals,
      buyer_referrals: record.buyer_referrals,
      seller_referrals: record.seller_referrals,
      can_withdraw: record.pending_earnings >= MIN_WITHDRAWAL_GHS,
      min_withdrawal: MIN_WITHDRAWAL_GHS,
      commissions: maskedCommissions,
      payouts: payouts ?? [],
    })
  } catch (err) {
    console.error('[referrals/dashboard]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/referrals/dashboard
 * Update leaderboard_display preference.
 * Body: { leaderboard_display: 'name' | 'anonymous' }
 */
export async function PATCH(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leaderboard_display } = (await req.json()) as {
      leaderboard_display?: 'name' | 'anonymous'
    }

    if (leaderboard_display !== 'name' && leaderboard_display !== 'anonymous') {
      return NextResponse.json({ error: 'Invalid leaderboard_display value' }, { status: 400 })
    }

    await supabase
      .from('referrals')
      .update({ leaderboard_display })
      .eq('user_id', authData.user.id)

    return NextResponse.json({ updated: true })
  } catch (err) {
    console.error('[referrals/dashboard PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
