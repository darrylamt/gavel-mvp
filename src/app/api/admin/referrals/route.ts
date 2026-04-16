import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { maskBidderEmail } from '@/lib/maskBidderEmail'
import { getCurrentPeriod, getPeriodRange } from '@/lib/referrals'

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
 * GET /api/admin/referrals
 * Returns summary stats, commission list, and payout batches for admin dashboard.
 */
export async function GET(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    const admin = await assertAdmin(token)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') ?? 'all'

    // Summary stats
    const period = getCurrentPeriod()
    const { start, end } = getPeriodRange(period)

    const { data: monthlyPaidRows } = await supabase
      .from('referral_commissions')
      .select('commission_amount')
      .eq('status', 'paid')
      .gte('paid_at', start)
      .lt('paid_at', end)

    const monthlyPaid = (monthlyPaidRows ?? []).reduce(
      (sum, r) => sum + Number(r.commission_amount),
      0
    )

    const { data: pendingRows } = await supabase
      .from('referral_commissions')
      .select('commission_amount')
      .eq('status', 'pending')

    const totalPending = (pendingRows ?? []).reduce(
      (sum, r) => sum + Number(r.commission_amount),
      0
    )

    const { count: activeReferrers } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .gt('total_earnings', 0)

    // Top referrer this month
    const { data: topMonthly } = await supabase
      .from('referral_commissions')
      .select('referrer_id, commission_amount')
      .gte('triggered_at', start)
      .lt('triggered_at', end)

    let topReferrerName = '—'
    if (topMonthly && topMonthly.length > 0) {
      const totals = new Map<string, number>()
      for (const r of topMonthly) {
        totals.set(r.referrer_id, (totals.get(r.referrer_id) ?? 0) + Number(r.commission_amount))
      }
      const topId = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (topId) {
        const { data: authUser } = await supabase.auth.admin.getUserById(topId)
        topReferrerName = maskBidderEmail(authUser?.user?.email) ?? '—'
      }
    }

    // Commission table
    let commissionsQuery = supabase
      .from('referral_commissions')
      .select('id, referrer_id, referred_user_id, gross_amount, commission_amount, status, triggered_at, paid_at, order_id')
      .order('triggered_at', { ascending: false })
      .limit(100)

    if (statusFilter !== 'all') {
      commissionsQuery = commissionsQuery.eq('status', statusFilter)
    }

    const { data: commissions } = await commissionsQuery

    const maskedCommissions = await Promise.all(
      (commissions ?? []).map(async (c) => {
        const [referrerAuth, referredAuth] = await Promise.all([
          supabase.auth.admin.getUserById(c.referrer_id),
          supabase.auth.admin.getUserById(c.referred_user_id),
        ])
        return {
          ...c,
          referrer_masked: maskBidderEmail(referrerAuth.data?.user?.email) ?? c.referrer_id.slice(0, 8),
          referred_masked: maskBidderEmail(referredAuth.data?.user?.email) ?? c.referred_user_id.slice(0, 8),
        }
      })
    )

    // Payout batches
    const { data: payoutBatches } = await supabase
      .from('referral_payouts')
      .select('id, referrer_id, amount, period, status, paid_at, created_at, paystack_transfer_code')
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      summary: {
        monthly_paid: monthlyPaid,
        total_pending: totalPending,
        active_referrers: activeReferrers ?? 0,
        top_referrer_this_month: topReferrerName,
      },
      commissions: maskedCommissions,
      payout_batches: payoutBatches ?? [],
    })
  } catch (err) {
    console.error('[admin/referrals]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
