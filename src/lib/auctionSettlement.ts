import type { SupabaseClient } from '@supabase/supabase-js'
import 'server-only'
import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'
import { queueAuctionClosedNotifications } from '@/lib/arkesel/events'
import { sendNotificationEmail } from '@/lib/resend-service'

/**
 * Shared auction-settlement logic used by BOTH the cron (`/api/auctions/settle-ended`)
 * and the on-page settle endpoint (`/api/auctions/close`).
 *
 * Before this existed, those two routes had separate, divergent refund logic and
 * the cron never assigned a winner or sent notifications at all — it only refunded
 * tokens. That meant an auction whose `status` was flipped to `ended` by the cron
 * (or any other path) before a human opened its page would NEVER get a winner,
 * because the page-side settle was gated on `status !== 'ended'`. Centralising the
 * logic here makes settlement deterministic regardless of who triggers it.
 */

const BID_TOKEN_COST = 1

// Only notify (SMS/email/in-app) for auctions that ended within this window.
// This stops the FIRST post-deploy cron pass — which sweeps the whole historical
// backlog of ended auctions — from blasting "you won" / "reserve not met"
// messages for auctions that closed weeks or months ago. Winner assignment and
// token refunds still happen for all of them; only the outbound comms are gated.
const NOTIFY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type SettlementResult = {
  auctionId: string
  reason: 'ok' | 'auction_not_ended' | 'already_paid' | 'no_eligible_bids'
  winningBidId: string | null
  winnerUserId: string | null
  winnerAmount: number | null
  paymentDueAt: string | null
  reserveMet: boolean
  refundsIssued: boolean
  refundedUsers: number
}

/**
 * Refund the bid tokens of every losing bidder for an auction. The winner keeps
 * (consumes) the tokens they spent. Idempotent: a single `refund:auction:{id}`
 * marker transaction guards against double-refunding if settlement runs twice.
 *
 * Returns the number of users refunded (0 if already refunded or no losers).
 */
export async function refundLosingBidders(
  supabase: SupabaseClient,
  auctionId: string,
  winnerUserId: string | null
): Promise<{ refundsIssued: boolean; refundedUsers: number }> {
  const refundKey = `refund:auction:${auctionId}`

  const { data: existingRefunds } = await supabase
    .from('token_transactions')
    .select('id')
    .eq('type', 'refund')
    .eq('reference', refundKey)
    .limit(1)

  if (existingRefunds && existingRefunds.length > 0) {
    return { refundsIssued: false, refundedUsers: 0 }
  }

  const { data: allBids } = await supabase
    .from('bids')
    .select('id, user_id')
    .eq('auction_id', auctionId)

  if (!allBids || allBids.length === 0) {
    return { refundsIssued: false, refundedUsers: 0 }
  }

  // Count bids per user so each losing bidder is refunded one token per bid.
  const bidCountByUser = new Map<string, number>()
  for (const bid of allBids) {
    bidCountByUser.set(bid.user_id, (bidCountByUser.get(bid.user_id) ?? 0) + 1)
  }

  let refundedUsers = 0
  for (const [userId, bidCount] of bidCountByUser.entries()) {
    if (userId === winnerUserId) continue // winner's tokens are consumed, not refunded

    const refundAmount = bidCount * BID_TOKEN_COST

    const { data: profile } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', userId)
      .single()

    if (!profile) continue

    await supabase
      .from('profiles')
      .update({ token_balance: (profile.token_balance ?? 0) + refundAmount })
      .eq('id', userId)

    await supabase.from('token_transactions').insert({
      user_id: userId,
      amount: refundAmount,
      type: 'refund',
      reference: refundKey,
    })

    refundedUsers++
  }

  return { refundsIssued: true, refundedUsers }
}

/** Re-list the linked shop product when an auction closes without a winner. */
async function restoreShopProductIfUnsold(
  supabase: SupabaseClient,
  auctionId: string,
  hasWinner: boolean
) {
  if (hasWinner) return

  const { data: auctionLink } = await supabase
    .from('auctions')
    .select('shop_product_id')
    .eq('id', auctionId)
    .maybeSingle<{ shop_product_id: string | null }>()

  if (auctionLink?.shop_product_id) {
    await supabase
      .from('shop_products')
      .update({ status: 'active' })
      .eq('id', auctionLink.shop_product_id)
  }
}

/**
 * Insert a one-off in-app notification for the auction winner. Idempotent: we
 * skip if a notification already points at this auction's pay page for the user.
 */
async function insertWinnerInAppNotification(
  supabase: SupabaseClient,
  params: { auctionId: string; winnerUserId: string; auctionTitle: string; amount: number | null }
) {
  const link = `/auctions/${params.auctionId}/pay`

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', params.winnerUserId)
    .eq('link', link)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return

  await supabase.from('notifications').insert({
    user_id: params.winnerUserId,
    title: 'You won an auction! 🎉',
    message:
      `Your bid${params.amount != null ? ` of GHS ${params.amount}` : ''} won "${params.auctionTitle}". ` +
      `Complete payment within 48 hours to claim your item.`,
    type: 'success',
    link,
  })
}

/**
 * Fan out all "auction closed" notifications: winner + seller SMS (Arkesel,
 * deduped), winner in-app notification, and winner/seller emails (fire-and-forget).
 *
 * NOTE: the seller is `auctions.seller_id`. Earlier code selected a non-existent
 * `created_by` column, which made the meta lookup return null and silently
 * skipped every notification (and seller payout). Always use `seller_id`.
 */
export async function sendAuctionClosedNotifications(
  supabase: SupabaseClient,
  params: {
    auctionId: string
    auctionTitle: string
    sellerId: string | null
    winnerUserId: string | null
    winnerAmount: number | null
    reserveMet: boolean
    // Emails are NOT deduplicated by the provider, so the caller must only set
    // this on a fresh assignment (e.g. the first cron pass that picks a winner)
    // to avoid re-emailing the winner/seller on every subsequent cron run.
    sendEmails: boolean
  }
) {
  // SMS (winner "you won, pay now" + seller "sold/reserve not met"). Deduped
  // internally via dedupeKey so re-running settlement won't re-send.
  await queueAuctionClosedNotifications({
    auctionId: params.auctionId,
    auctionTitle: params.auctionTitle,
    sellerUserId: params.sellerId,
    winnerUserId: params.winnerUserId,
    winnerAmount: params.winnerAmount,
    reserveMet: params.reserveMet,
  }).catch((err) => console.error(`[auction-settle] SMS notify failed for ${params.auctionId}:`, err))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

  if (params.reserveMet && params.winnerUserId) {
    const payUrl = `${siteUrl}/auctions/${params.auctionId}/pay`

    await insertWinnerInAppNotification(supabase, {
      auctionId: params.auctionId,
      winnerUserId: params.winnerUserId,
      auctionTitle: params.auctionTitle,
      amount: params.winnerAmount,
    }).catch((err) => console.error(`[auction-settle] in-app notify failed for ${params.auctionId}:`, err))

    // Emails (best effort). Winner gets "you won"; seller gets "your item sold".
    const { data: { user: winnerAuth } } = await supabase.auth.admin.getUserById(params.winnerUserId)
    const { data: winnerProfile } = await supabase
      .from('profiles')
      .select('username, phone')
      .eq('id', params.winnerUserId)
      .single()

    if (params.sendEmails && winnerAuth?.email) {
      await sendNotificationEmail(winnerAuth.email, 'auctionWon', {
        userName: winnerProfile?.username || winnerAuth.email.split('@')[0] || 'there',
        auctionTitle: params.auctionTitle,
        winningBid: params.winnerAmount ?? 0,
        auctionUrl: payUrl,
      }).catch(() => {})
    }

    if (params.sendEmails && params.sellerId) {
      const { data: { user: sellerAuth } } = await supabase.auth.admin.getUserById(params.sellerId)
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', params.sellerId)
        .single()

      if (sellerAuth?.email) {
        await sendNotificationEmail(sellerAuth.email, 'auctionEnded', {
          sellerName: sellerProfile?.username || sellerAuth.email.split('@')[0] || 'there',
          auctionTitle: params.auctionTitle,
          winningBid: params.winnerAmount ?? 0,
          winnerEmail: winnerAuth?.email || 'N/A',
          winnerPhone: winnerProfile?.phone || undefined,
          auctionUrl: `${siteUrl}/auctions/${params.auctionId}`,
        }).catch(() => {})
      }
    }
  }
}

/**
 * Settle a single ended auction: resolve the winning candidate (this assigns
 * `winner_id` + `winning_bid_id` + a 48h payment window when a winner exists),
 * refund losing bidders, re-list the product if unsold, and notify everyone.
 *
 * Safe to call repeatedly: candidate resolution, refunds and notifications are
 * all idempotent.
 */
export async function settleAuction(
  supabase: SupabaseClient,
  auctionId: string
): Promise<SettlementResult> {
  const { data: meta } = await supabase
    .from('auctions')
    .select('id, title, seller_id, ends_at, winning_bid_id, auction_payment_due_at')
    .eq('id', auctionId)
    .maybeSingle<{
      id: string
      title: string | null
      seller_id: string | null
      ends_at: string | null
      winning_bid_id: string | null
      auction_payment_due_at: string | null
    }>()

  const title = meta?.title || 'Auction'
  const recentlyEnded =
    !!meta?.ends_at && Date.now() - Date.parse(meta.ends_at) < NOTIFY_WINDOW_MS
  // Snapshot the candidate state BEFORE resolution so we can tell whether this
  // pass is the first time a winner was assigned (→ send emails once) vs. a
  // repeat cron pass over an already-settled auction (→ skip emails).
  const prevWinningBidId = meta?.winning_bid_id ?? null
  const prevDueAtFuture =
    !!meta?.auction_payment_due_at && Date.parse(meta.auction_payment_due_at) > Date.now()

  console.log(`[auction-settle] Processing auction ${auctionId}: "${title}"`)

  const resolution = await resolveAuctionPaymentCandidate(supabase, auctionId)
  const candidate = resolution.activeCandidate

  const isFreshAssignment = !!candidate && (prevWinningBidId !== candidate.bidId || !prevDueAtFuture)

  console.log(
    `[auction-settle] ${auctionId} reason=${resolution.reason} ` +
      `winner=${candidate?.userId ?? 'none'} bid=${candidate?.bidId ?? 'none'} ` +
      `amount=${candidate?.amount ?? 'n/a'} reserveMet=${!!candidate}`
  )

  if (resolution.reason === 'auction_not_ended') {
    return {
      auctionId,
      reason: resolution.reason,
      winningBidId: null,
      winnerUserId: null,
      winnerAmount: null,
      paymentDueAt: null,
      reserveMet: false,
      refundsIssued: false,
      refundedUsers: 0,
    }
  }

  if (resolution.reason === 'already_paid') {
    return {
      auctionId,
      reason: resolution.reason,
      winningBidId: resolution.auction.winning_bid_id,
      winnerUserId: resolution.auction.winner_id,
      winnerAmount: candidate?.amount ?? null,
      paymentDueAt: resolution.paymentDueAt,
      reserveMet: true,
      refundsIssued: false,
      refundedUsers: 0,
    }
  }

  const { refundsIssued, refundedUsers } = await refundLosingBidders(
    supabase,
    auctionId,
    candidate?.userId ?? null
  )

  await restoreShopProductIfUnsold(supabase, auctionId, !!candidate)

  // Suppress all outbound comms for auctions that ended outside the notify
  // window (i.e. the historical backlog) — they still get a winner + refunds.
  if (recentlyEnded) {
    await sendAuctionClosedNotifications(supabase, {
      auctionId,
      auctionTitle: title,
      sellerId: meta?.seller_id ?? null,
      winnerUserId: candidate?.userId ?? null,
      winnerAmount: candidate?.amount ?? null,
      reserveMet: !!candidate,
      sendEmails: isFreshAssignment,
    })
  } else {
    console.log(`[auction-settle] ${auctionId} ended outside notify window — skipping notifications`)
  }

  return {
    auctionId,
    reason: resolution.reason,
    winningBidId: candidate?.bidId ?? null,
    winnerUserId: candidate?.userId ?? null,
    winnerAmount: candidate?.amount ?? null,
    paymentDueAt: resolution.paymentDueAt,
    reserveMet: !!candidate,
    refundsIssued,
    refundedUsers,
  }
}
