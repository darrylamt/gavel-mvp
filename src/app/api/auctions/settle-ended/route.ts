import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import * as Sentry from '@sentry/nextjs'
import { settleAuction } from '@/lib/auctionSettlement'

/**
 * GET /api/auctions/settle-ended
 *
 * Cron job (see vercel.json): finds every auction whose `ends_at` has passed but
 * which has not been fully settled, then settles each one — assigning the winner,
 * refunding losing bidders, re-listing unsold items, and sending winner/seller
 * notifications.
 *
 * IMPORTANT: this is the AUTHORITATIVE settlement path. Winner assignment must
 * not depend on a user happening to open the auction page (that page-side
 * `/api/auctions/close` call is only a best-effort fallback). Historically this
 * cron only refunded tokens and never assigned a winner, so any auction the cron
 * marked `ended` before someone visited its page was left with no winner forever.
 *
 * Auth accepts EITHER mechanism so it works regardless of how it's triggered:
 *   1. `Authorization: Bearer <CRON_SECRET>` — auto-attached by Vercel Cron.
 *   2. `?secret=<CRON_SECRET>` query param — for external schedulers (EasyCron),
 *      matching the convention used by the other cron routes in vercel.json.
 *
 * On non-Pro Vercel plans, native Cron runs at most once per day, so an external
 * scheduler (EasyCron) hitting the `?secret=` URL every ~15 min is the reliable
 * trigger. Both paths are idempotent, so overlapping triggers are safe.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader === `Bearer ${cronSecret}`) return true
  const querySecret = new URL(req.url).searchParams.get('secret')
  return querySecret === cronSecret
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  // Find auctions whose end time has passed and that are not yet fully paid.
  // settleAuction() is idempotent, so re-processing already-settled auctions is
  // safe (it short-circuits on already_paid and dedupes refunds/notifications).
  const { data: endedAuctions, error } = await supabase
    .from('auctions')
    .select('id, title')
    .lt('ends_at', nowIso)
    .in('status', ['active', 'scheduled', 'ended'])
    .eq('paid', false)
    .order('ends_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('[settle-ended] failed to fetch auctions:', error)
    Sentry.captureException(error, { tags: { route: 'settle-ended', phase: 'fetch' } })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!endedAuctions || endedAuctions.length === 0) {
    return NextResponse.json({ settled: 0, message: 'Nothing to settle' })
  }

  const results: Array<{ id: string; reason: string; winner: string | null; refunded: number; error?: string }> = []

  for (const auction of endedAuctions) {
    try {
      const result = await settleAuction(supabase, auction.id)
      results.push({
        id: auction.id,
        reason: result.reason,
        winner: result.winnerUserId,
        refunded: result.refundedUsers,
      })
    } catch (err) {
      // Never let one bad auction abort the batch, and surface the error loudly
      // (console + Sentry) so a recurrence is caught instead of failing silently.
      console.error(`[settle-ended] failed for auction ${auction.id}:`, err)
      Sentry.captureException(err, {
        tags: { route: 'settle-ended', phase: 'settle' },
        extra: { auctionId: auction.id },
      })
      results.push({ id: auction.id, reason: 'error', winner: null, refunded: 0, error: String(err) })
    }
  }

  const winners = results.filter((r) => r.winner).length
  const errors = results.filter((r) => r.reason === 'error').length
  console.log(`[settle-ended] completed: processed=${results.length} winners=${winners} errors=${errors}`)

  return NextResponse.json({ settled: results.length, winners, errors, results })
}
