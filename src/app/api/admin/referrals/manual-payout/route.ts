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

async function assertAdmin(token: string) {
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle<{ role: string }>()
  return profile?.role === 'admin' ? data.user : null
}

/**
 * POST /api/admin/referrals/manual-payout
 * Trigger an immediate payout for a specific referrer.
 * Body: { referrer_id: string }
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    const admin = await assertAdmin(token)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { referrer_id } = (await req.json()) as { referrer_id?: string }
    if (!referrer_id) {
      return NextResponse.json({ error: 'referrer_id is required' }, { status: 400 })
    }

    const { data: referral } = await supabase
      .from('referrals')
      .select('is_verified, pending_earnings')
      .eq('user_id', referrer_id)
      .maybeSingle<{ is_verified: boolean; pending_earnings: number }>()

    if (!referral) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })
    }

    if (referral.pending_earnings < MIN_WITHDRAWAL_GHS) {
      return NextResponse.json({
        error: `Pending earnings (GHS ${referral.pending_earnings.toFixed(2)}) below minimum GHS ${MIN_WITHDRAWAL_GHS}`,
      }, { status: 400 })
    }

    const { data: payoutAccount } = await supabase
      .from('seller_payout_accounts')
      .select('recipient_code')
      .eq('seller_id', referrer_id)
      .eq('is_default', true)
      .maybeSingle<{ recipient_code: string }>()

    let recipientCode = payoutAccount?.recipient_code ?? null
    if (!recipientCode) {
      const { data: fallback } = await supabase
        .from('seller_payout_accounts')
        .select('recipient_code')
        .eq('seller_id', referrer_id)
        .not('recipient_code', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ recipient_code: string }>()
      recipientCode = fallback?.recipient_code ?? null
    }

    if (!recipientCode) {
      return NextResponse.json({ error: 'No payout account found for this referrer' }, { status: 400 })
    }

    const { data: commissions } = await supabase
      .from('referral_commissions')
      .select('id, commission_amount')
      .eq('referrer_id', referrer_id)
      .eq('status', 'approved')

    if (!commissions || commissions.length === 0) {
      return NextResponse.json({ error: 'No approved commissions to pay out' }, { status: 400 })
    }

    const totalAmount = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0)
    const commissionIds = commissions.map((c) => c.id)
    const period = getCurrentPeriod()
    const reference = `refpayout_${referrer_id.slice(0, 8)}_${Date.now()}`

    const { data: payoutRecord, error: payoutErr } = await supabase
      .from('referral_payouts')
      .insert({
        referrer_id,
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

    const transfer = await initiateTransfer(
      recipientCode,
      totalAmount,
      `Gavel referral manual payout (admin)`,
      reference
    )

    const transferCode = transfer.data?.transfer_code ?? null

    await supabase
      .from('referral_payouts')
      .update({ paystack_transfer_code: transferCode })
      .eq('id', payoutRecord.id)

    await supabase
      .from('referral_commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .in('id', commissionIds)

    await supabase.rpc('finalize_referral_payout', {
      p_referrer_id: referrer_id,
      p_amount: totalAmount,
    })

    await queueReferralPayoutNotification({ userId: referrer_id, amountGHS: totalAmount, period })

    return NextResponse.json({ success: true, amount: totalAmount, transfer_code: transferCode })
  } catch (err) {
    console.error('[admin/referrals/manual-payout]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
