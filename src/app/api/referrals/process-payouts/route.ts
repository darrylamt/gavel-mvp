import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { initiateTransfer } from '@/lib/paystack-transfer'
import { getPreviousPeriod, getPeriodRange, MIN_WITHDRAWAL_GHS } from '@/lib/referrals'
import { queueReferralPayoutNotification } from '@/lib/arkesel/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/referrals/process-payouts?secret=REFERRAL_DISPATCH_SECRET
 * EasyCron: 1st of every month at 09:00 Ghana time
 * Finds all verified referrers with pending_earnings >= GHS 50,
 * batches their approved commissions, initiates Paystack transfers,
 * and marks commissions as paid.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.REFERRAL_DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const period = getPreviousPeriod()
  const { start, end } = getPeriodRange(period)

  console.log(`[referral/process-payouts] Running for period ${period} (${start} → ${end})`)

  // Find all verified referrers with enough pending earnings
  const { data: eligibleReferrers } = await supabase
    .from('referrals')
    .select('user_id, pending_earnings')
    .eq('is_verified', true)
    .gte('pending_earnings', MIN_WITHDRAWAL_GHS)

  if (!eligibleReferrers || eligibleReferrers.length === 0) {
    return NextResponse.json({ processed: 0, period })
  }

  const results = {
    processed: 0,
    skipped: 0,
    failed: 0,
    period,
  }

  for (const referrer of eligibleReferrers) {
    try {
      // Fetch approved commissions for the previous month
      const { data: commissions } = await supabase
        .from('referral_commissions')
        .select('id, commission_amount')
        .eq('referrer_id', referrer.user_id)
        .eq('status', 'approved')
        .gte('triggered_at', start)
        .lt('triggered_at', end)

      if (!commissions || commissions.length === 0) {
        results.skipped++
        continue
      }

      const totalAmount = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0)
      if (totalAmount < MIN_WITHDRAWAL_GHS) {
        results.skipped++
        continue
      }

      // Check seller has a payout account
      const { data: payoutAccount } = await supabase
        .from('seller_payout_accounts')
        .select('recipient_code')
        .eq('seller_id', referrer.user_id)
        .eq('is_default', true)
        .maybeSingle<{ recipient_code: string }>()

      let recipientCode = payoutAccount?.recipient_code ?? null

      if (!recipientCode) {
        const { data: fallback } = await supabase
          .from('seller_payout_accounts')
          .select('recipient_code')
          .eq('seller_id', referrer.user_id)
          .not('recipient_code', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle<{ recipient_code: string }>()
        recipientCode = fallback?.recipient_code ?? null
      }

      if (!recipientCode) {
        console.warn(`[referral/process-payouts] No payout account for user ${referrer.user_id}`)
        results.skipped++
        continue
      }

      const commissionIds = commissions.map((c) => c.id)
      const reference = `refpayout_${referrer.user_id.slice(0, 8)}_${Date.now()}`

      // Create payout record
      const { data: payoutRecord, error: payoutErr } = await supabase
        .from('referral_payouts')
        .insert({
          referrer_id: referrer.user_id,
          amount: totalAmount,
          period,
          status: 'processing',
          commission_ids: commissionIds,
        })
        .select('id')
        .single<{ id: string }>()

      if (payoutErr || !payoutRecord) {
        console.error(`[referral/process-payouts] Failed to insert payout for ${referrer.user_id}:`, payoutErr)
        results.failed++
        continue
      }

      // Initiate Paystack transfer
      const transfer = await initiateTransfer(
        recipientCode,
        totalAmount,
        `Gavel referral payout for ${period}`,
        reference
      )

      const transferCode = transfer.data?.transfer_code ?? null

      // Update payout with transfer code
      await supabase
        .from('referral_payouts')
        .update({ paystack_transfer_code: transferCode, status: 'processing' })
        .eq('id', payoutRecord.id)

      // Mark commissions as paid
      await supabase
        .from('referral_commissions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .in('id', commissionIds)

      // Move earnings from pending → paid on referral record
      await supabase.rpc('finalize_referral_payout', {
        p_referrer_id: referrer.user_id,
        p_amount: totalAmount,
      })

      // Send SMS notification
      await queueReferralPayoutNotification({
        userId: referrer.user_id,
        amountGHS: totalAmount,
        period,
      })

      results.processed++
    } catch (err) {
      console.error(`[referral/process-payouts] Error for user ${referrer.user_id}:`, err)
      results.failed++
    }
  }

  console.log(`[referral/process-payouts] Done:`, results)
  return NextResponse.json(results)
}
