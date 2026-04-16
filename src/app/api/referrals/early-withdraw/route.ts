import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { initiateTransfer } from '@/lib/paystack-transfer'
import { getCurrentPeriod, MIN_WITHDRAWAL_GHS } from '@/lib/referrals'
import { queueReferralPayoutNotification } from '@/lib/arkesel/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/referrals/early-withdraw
 * Allows a verified referrer to request an early payout of approved commissions.
 * Requires pending_earnings >= GHS 50 and a saved payout account.
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authData.user.id

    const { data: referral } = await supabase
      .from('referrals')
      .select('is_verified, pending_earnings')
      .eq('user_id', userId)
      .maybeSingle<{ is_verified: boolean; pending_earnings: number }>()

    if (!referral) {
      return NextResponse.json({ error: 'Referral record not found' }, { status: 404 })
    }

    if (!referral.is_verified) {
      return NextResponse.json({ error: 'Phone verification required before withdrawal' }, { status: 403 })
    }

    if (referral.pending_earnings < MIN_WITHDRAWAL_GHS) {
      return NextResponse.json({
        error: `Minimum withdrawal is GHS ${MIN_WITHDRAWAL_GHS}. Your balance is GHS ${referral.pending_earnings.toFixed(2)}.`,
      }, { status: 400 })
    }

    // Check for a payout account
    const { data: payoutAccount } = await supabase
      .from('seller_payout_accounts')
      .select('recipient_code')
      .eq('seller_id', userId)
      .eq('is_default', true)
      .maybeSingle<{ recipient_code: string }>()

    let recipientCode = payoutAccount?.recipient_code ?? null

    if (!recipientCode) {
      const { data: fallback } = await supabase
        .from('seller_payout_accounts')
        .select('recipient_code')
        .eq('seller_id', userId)
        .not('recipient_code', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ recipient_code: string }>()
      recipientCode = fallback?.recipient_code ?? null
    }

    if (!recipientCode) {
      return NextResponse.json({
        error: 'No payout account found. Please add a bank or Mobile Money account in your profile settings.',
      }, { status: 400 })
    }

    // Fetch approved commissions
    const { data: commissions } = await supabase
      .from('referral_commissions')
      .select('id, commission_amount')
      .eq('referrer_id', userId)
      .eq('status', 'approved')

    if (!commissions || commissions.length === 0) {
      return NextResponse.json({ error: 'No approved commissions available for withdrawal' }, { status: 400 })
    }

    const totalAmount = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0)
    const commissionIds = commissions.map((c) => c.id)
    const period = getCurrentPeriod()
    const reference = `refpayout_${userId.slice(0, 8)}_${Date.now()}`

    // Create payout record
    const { data: payoutRecord, error: payoutErr } = await supabase
      .from('referral_payouts')
      .insert({
        referrer_id: userId,
        amount: totalAmount,
        period,
        status: 'processing',
        commission_ids: commissionIds,
      })
      .select('id')
      .single<{ id: string }>()

    if (payoutErr || !payoutRecord) {
      return NextResponse.json({ error: 'Failed to create payout record' }, { status: 500 })
    }

    // Initiate Paystack transfer
    const transfer = await initiateTransfer(
      recipientCode,
      totalAmount,
      `Gavel referral early withdrawal`,
      reference
    )

    const transferCode = transfer.data?.transfer_code ?? null

    await supabase
      .from('referral_payouts')
      .update({ paystack_transfer_code: transferCode })
      .eq('id', payoutRecord.id)

    // Mark commissions as paid
    await supabase
      .from('referral_commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .in('id', commissionIds)

    await supabase.rpc('finalize_referral_payout', {
      p_referrer_id: userId,
      p_amount: totalAmount,
    })

    await queueReferralPayoutNotification({ userId, amountGHS: totalAmount, period })

    return NextResponse.json({ success: true, amount: totalAmount, transfer_code: transferCode })
  } catch (err) {
    console.error('[referrals/early-withdraw]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
