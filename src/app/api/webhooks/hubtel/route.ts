import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { HubtelProvider } from '@/lib/payment/hubtel'
import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'
import {
  queueAuctionPaymentReceivedNotifications,
  queueSwapSubmissionReceivedNotification,
  queueReferralEarningNotification,
} from '@/lib/arkesel/events'
import { processReferralCommission } from '@/lib/referrals'
import { sendNotificationEmail } from '@/lib/resend-service'

/**
 * Hubtel payment webhook handler.
 *
 * Hubtel POSTs to this URL when a payment completes (success or failure).
 * The payload includes a ClientReference which maps to a row in payment_intents.
 *
 * Business logic mirrors the Paystack webhook at /api/paystack/webhook.
 * If you add new payment types there, add them here too.
 *
 * Expected Hubtel payload:
 * {
 *   "ResponseCode": "0000",
 *   "Status": "Success",
 *   "Data": {
 *     "CheckoutId": "...",
 *     "ClientReference": "gvl_...",
 *     "Amount": 50.00,
 *     "Description": "...",
 *     "CustomerPhoneNumber": "0244000000",
 *     "PaymentType": "MobileMoney"
 *   }
 * }
 */
export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 503 })
  }

  const rawBody = await req.text()

  // Verify webhook authenticity
  const provider = new HubtelProvider()
  if (!provider.verifyWebhookSignature(rawBody, req.headers)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Normalise casing — Hubtel uses PascalCase in some versions, camelCase in others
  const responseCode = String(event.ResponseCode ?? event.responseCode ?? '')
  const status = String(
    (event.Data as Record<string, unknown> | null)?.Status ??
    (event.Data as Record<string, unknown> | null)?.status ??
    event.Status ??
    event.status ??
    ''
  ).toLowerCase()

  const data = (event.Data ?? event.data ?? {}) as Record<string, unknown>
  const clientReference = String(data.ClientReference ?? data.clientReference ?? '')
  const amountGHS = Number(data.Amount ?? data.amount ?? 0)

  // Only process successful payments
  if (responseCode !== '0000' || status !== 'success') {
    // Log failed payment for debugging
    console.warn('[Hubtel webhook] Non-success event:', { responseCode, status, clientReference })
    return NextResponse.json({ received: true })
  }

  if (!clientReference) {
    console.error('[Hubtel webhook] Missing ClientReference')
    return NextResponse.json({ received: true })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Look up payment intent metadata
  const { data: intent } = await supabase
    .from('payment_intents')
    .select('metadata, amount_ghs')
    .eq('id', clientReference)
    .maybeSingle()

  if (!intent) {
    console.error('[Hubtel webhook] No payment intent found for reference:', clientReference)
    return NextResponse.json({ received: true })
  }

  const metadata = (intent.metadata ?? {}) as Record<string, unknown>
  const paymentType = String(metadata.type ?? '')

  // ── Auction payment ──────────────────────────────────────────────────────────
  if (paymentType === 'auction_payment') {
    const auction_id = String(metadata.auction_id ?? '')
    const bid_id = String(metadata.bid_id ?? '')
    const user_id = String(metadata.user_id ?? '')

    if (!auction_id || !bid_id || !user_id) {
      console.error('[Hubtel webhook] Incomplete auction_payment metadata:', metadata)
      return NextResponse.json({ received: true })
    }

    const resolution = await resolveAuctionPaymentCandidate(supabase, auction_id)

    if (resolution.reason === 'already_paid') {
      return NextResponse.json({ received: true })
    }

    if (resolution.reason !== 'ok' || !resolution.activeCandidate) {
      return NextResponse.json({ received: true })
    }

    if (
      resolution.activeCandidate.bidId !== bid_id ||
      resolution.activeCandidate.userId !== user_id
    ) {
      console.error('[Hubtel webhook] bid/user mismatch for auction:', auction_id)
      return NextResponse.json({ received: true })
    }

    // Mark auction as paid
    await supabase
      .from('auctions')
      .update({
        status: 'ended',
        paid: true,
        winner_id: resolution.activeCandidate.userId,
        winning_bid_id: resolution.activeCandidate.bidId,
        auction_payment_due_at: null,
      })
      .eq('id', auction_id)

    // Referral commission
    const grossAmountGHS = amountGHS > 0 ? amountGHS : Number(intent.amount_ghs)
    const result = await processReferralCommission(supabase, {
      buyerId: user_id,
      grossAmountGHS,
      auctionId: auction_id,
      transactionReference: clientReference,
    })

    if (result.created) {
      const { data: commission } = await supabase
        .from('referral_commissions')
        .select('id, referrer_id, commission_amount')
        .eq('auction_id', auction_id)
        .eq('referred_user_id', user_id)
        .maybeSingle<{ id: string; referrer_id: string; commission_amount: number }>()

      if (commission) {
        queueReferralEarningNotification({
          userId: commission.referrer_id,
          commissionGHS: Number(commission.commission_amount),
          commissionId: commission.id,
        }).catch(() => {})

        supabase.auth.admin.getUserById(commission.referrer_id).then(({ data: lu }) => {
          const email = lu.user?.email
          if (!email) return
          supabase
            .from('referrals')
            .select('pending_earnings')
            .eq('user_id', commission.referrer_id)
            .maybeSingle()
            .then(({ data: ref }) => {
              supabase
                .from('profiles')
                .select('username')
                .eq('id', commission.referrer_id)
                .maybeSingle()
                .then(({ data: prof }) => {
                  sendNotificationEmail(email, 'referralEarning', {
                    referrerName:
                      (prof as { username?: string } | null)?.username ?? email.split('@')[0],
                    commissionGHS: Number(commission.commission_amount),
                    totalPendingGHS: Number(
                      (ref as { pending_earnings?: number } | null)?.pending_earnings ??
                        commission.commission_amount
                    ),
                    dashboardUrl: 'https://gavelgh.com/referrals',
                  }).catch(() => {})
                })
            })
        }).catch(() => {})
      }
    }

    // Auction payment notifications + payout escrow
    const { data: auctionMeta } = await supabase
      .from('auctions')
      .select('id, title, created_by')
      .eq('id', auction_id)
      .maybeSingle<{ id: string; title: string | null; created_by: string | null }>()

    if (auctionMeta) {
      await queueAuctionPaymentReceivedNotifications({
        auctionId: auctionMeta.id,
        auctionTitle: auctionMeta.title ?? 'Auction',
        winnerUserId: user_id,
        sellerUserId: auctionMeta.created_by,
        amount: grossAmountGHS,
      })

      // Create payout record in escrow (5-day hold)
      if (auctionMeta.created_by) {
        const COMMISSION_RATE = 0.1
        const commissionAmount = grossAmountGHS * COMMISSION_RATE
        const payoutAmount = grossAmountGHS * (1 - COMMISSION_RATE)

        const { data: defaultPayoutAccount } = await supabase
          .from('seller_payout_accounts')
          .select('recipient_code')
          .eq('seller_id', auctionMeta.created_by)
          .eq('is_default', true)
          .maybeSingle()

        let recipientCode = defaultPayoutAccount?.recipient_code ?? null

        if (!recipientCode) {
          const { data: fallback } = await supabase
            .from('seller_payout_accounts')
            .select('recipient_code')
            .eq('seller_id', auctionMeta.created_by)
            .not('recipient_code', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          recipientCode = fallback?.recipient_code ?? null
        }

        if (recipientCode) {
          const scheduledRelease = new Date()
          scheduledRelease.setDate(scheduledRelease.getDate() + 5)
          await supabase.from('payouts').insert({
            auction_id,
            seller_id: auctionMeta.created_by,
            buyer_id: user_id,
            gross_amount: grossAmountGHS,
            commission_amount: commissionAmount,
            payout_amount: payoutAmount,
            recipient_code: recipientCode,
            status: 'pending',
            scheduled_release_at: scheduledRelease.toISOString(),
          })
        }
      }
    }

    // Log payment
    await supabase.from('payments').insert({
      user_id,
      auction_id,
      amount: grossAmountGHS,
      status: 'success',
      reference: clientReference,
    })
  }

  // ── Token purchase ────────────────────────────────────────────────────────────
  if (paymentType === 'token_purchase') {
    const user_id = String(metadata.user_id ?? '')
    const tokens = Number(metadata.tokens ?? 0)

    if (!user_id || !tokens) {
      console.error('[Hubtel webhook] Incomplete token_purchase metadata:', metadata)
      return NextResponse.json({ received: true })
    }

    // Idempotency — check if already credited
    const { data: existing } = await supabase
      .from('token_transactions')
      .select('id')
      .eq('reference', clientReference)
      .maybeSingle()

    if (!existing) {
      await supabase.rpc('increment_tokens', { uid: user_id, amount: tokens })

      await supabase.from('token_transactions').insert({
        user_id,
        amount: tokens,
        type: 'purchase',
        reference: clientReference,
        purchase_amount: amountGHS > 0 ? amountGHS : Number(intent.amount_ghs),
        purchase_currency: 'GHS',
      })
    }
  }

  // ── Swap deposit ──────────────────────────────────────────────────────────────
  if (paymentType === 'swap_deposit') {
    const submission_id = String(metadata.submission_id ?? '')
    const user_id = String(metadata.user_id ?? '')

    if (submission_id && user_id) {
      const { data: submission } = await supabase
        .from('swap_submissions')
        .select('id, user_id, deposit_paid')
        .eq('id', submission_id)
        .eq('user_id', user_id)
        .maybeSingle()

      if (submission && !submission.deposit_paid) {
        await supabase
          .from('swap_submissions')
          .update({
            deposit_paid: true,
            deposit_payment_reference: clientReference,
            status: 'pending_review',
          })
          .eq('id', submission_id)

        await queueSwapSubmissionReceivedNotification({ userId: user_id, submissionId: submission_id })
      }
    }
  }

  // ── Shop payment ──────────────────────────────────────────────────────────────
  // Shop payments have complex multi-item metadata.
  // The Hubtel webhook fires after Paystack was the default for a long time;
  // shop payments via Hubtel follow the same order-creation logic as the
  // Paystack webhook. If you add shop payment support here, mirror the logic
  // from the Paystack webhook handler at /api/paystack/webhook.
  if (paymentType === 'shop_payment') {
    console.info('[Hubtel webhook] shop_payment received — handler not yet implemented; process manually.')
  }

  return NextResponse.json({ received: true })
}
