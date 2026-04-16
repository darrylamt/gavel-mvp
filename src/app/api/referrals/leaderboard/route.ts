import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { maskBidderEmail } from '@/lib/maskBidderEmail'
import { getPeriodRange, getCurrentPeriod } from '@/lib/referrals'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/referrals/leaderboard?tab=monthly|all-time
 * Public endpoint — returns top 20 referrers.
 * Respects leaderboard_display setting for name vs. anonymous masking.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tab = searchParams.get('tab') === 'monthly' ? 'monthly' : 'all-time'

    let rows: Array<{
      user_id: string
      total_earnings: number
      total_referrals: number
      leaderboard_display: string
    }> = []

    if (tab === 'all-time') {
      const { data } = await supabase
        .from('referrals')
        .select('user_id, total_earnings, total_referrals, leaderboard_display')
        .order('total_earnings', { ascending: false })
        .limit(20)
      rows = data ?? []
    } else {
      // Monthly: sum commissions in current period
      const { start, end } = getPeriodRange(getCurrentPeriod())

      const { data: monthlyData } = await supabase
        .from('referral_commissions')
        .select('referrer_id, commission_amount')
        .eq('status', 'approved')
        .gte('triggered_at', start)
        .lt('triggered_at', end)

      if (monthlyData && monthlyData.length > 0) {
        // Aggregate by referrer
        const totals = new Map<string, number>()
        for (const row of monthlyData) {
          totals.set(row.referrer_id, (totals.get(row.referrer_id) ?? 0) + Number(row.commission_amount))
        }

        const topIds = Array.from(totals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([id]) => id)

        const { data: referralRows } = await supabase
          .from('referrals')
          .select('user_id, total_referrals, leaderboard_display')
          .in('user_id', topIds)

        rows = topIds.map((id) => {
          const r = referralRows?.find((x) => x.user_id === id)
          return {
            user_id: id,
            total_earnings: totals.get(id) ?? 0,
            total_referrals: r?.total_referrals ?? 0,
            leaderboard_display: r?.leaderboard_display ?? 'anonymous',
          }
        })
      }
    }

    // Resolve display names
    const entries = await Promise.all(
      rows.map(async (row, index) => {
        let displayName: string

        if (row.leaderboard_display === 'name') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', row.user_id)
            .maybeSingle<{ username: string | null }>()

          const username = profile?.username?.trim() ?? ''
          const parts = username.split(' ').filter(Boolean)
          if (parts.length >= 2) {
            displayName = `${parts[0]} ${parts[1].charAt(0)}.`
          } else if (parts.length === 1) {
            displayName = parts[0]
          } else {
            // Fall back to masked email
            const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id)
            displayName = maskBidderEmail(authUser?.user?.email) ?? 'Anonymous'
          }
        } else {
          const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id)
          displayName = maskBidderEmail(authUser?.user?.email) ?? 'Anonymous'
        }

        return {
          rank: index + 1,
          display_name: displayName,
          total_referrals: row.total_referrals,
          earnings: Number(row.total_earnings),
        }
      })
    )

    return NextResponse.json({ tab, entries })
  } catch (err) {
    console.error('[referrals/leaderboard]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
