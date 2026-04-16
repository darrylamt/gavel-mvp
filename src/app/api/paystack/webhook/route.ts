import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'
import {
  queuePayoutSuccessNotification,
  queuePayoutFailedNotification,
  queuePayoutReversedNotification,
  queueSwapSubmissionReceivedNotification,
  queueReferralEarningNotification,
} from '@/lib/arkesel/events'
import { processReferralCommission } from '@/lib/referrals'
import { sendNotificationEmail } from '@/lib/resend-service'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const paystackSecret = process.env.PAYSTACK_SECRET_KEY

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 503 })
  }
  if (!paystackSecret) {
    return NextResponse.json({ error: 'Payment webhook not configured' }, { status: 503 })
  }

  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''

  const hash = crypto
    .createHmac('sha512', paystackSecret)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let event: ReturnType<typeof JSON.parse>
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (event.event === 'charge.success') {
    const metadata = event.data?.metadata
    const auction_id = metadata?.auction_id
    const bid_id = metadata?.bid_id
    const user_id = metadata?.user_id

    if (metadata?.type === 'auction_payment' && auction_id && bid_id && user_id) {
      const resolution = await resolveAuctionPaymentCandidate(supabase, String(auction_id))

      if (resolution.reason === 'already_paid') {
        return NextResponse.json({ received: true })
      }

      if (resolution.reason !== 'ok' || !resolution.activeCandidate) {
        return NextResponse.json({ received: true })
      }

      if (
        resolution.activeCandidate.bidId !== String(bid_id) ||
        resolution.activeCandidate.userId !== String(user_id)
      ) {
        return NextResponse.json({ received: true })
      }

      await supabase
        .from('auctions')
        .update({
          status: 'ended',
          paid: true,
          winner_id: resolution.activeCandidate.userId,
          winning_bid_id: resolution.activeCandidate.bidId,
          auction_payment_due_at: null,
        })
        .eq('id', String(auction_id))

      // Referral commission for auction payment
      const grossAmountGHS = Number(event.data?.amount ?? 0) / 100
      const result = await processReferralCommission(supabase, {
        buyerId: String(user_id),
        grossAmountGHS,
        auctionId: String(auction_id),
        transactionReference: event.data?.reference ?? undefined,
      })

      if (result.created) {
        // Notify referrer of new earning (fire-and-forget)
        const { data: commission } = await supabase
          .from('referral_commissions')
          .select('id, referrer_id, commission_amount')
          .eq('auction_id', String(auction_id))
          .eq('referred_user_id', String(user_id))
          .maybeSingle<{ id: string; referrer_id: string; commission_amount: number }>()

        if (commission) {
          queueReferralEarningNotification({
            userId: commission.referrer_id,
            commissionGHS: Number(commission.commission_amount),
            commissionId: commission.id,
          }).catch(() => {})

          // Email notification
          const referrerId = commission.referrer_id
          const commGHS = Number(commission.commission_amount)
          supabase.auth.admin.getUserById(referrerId).then(({ data: lu }) => {
            const email = lu.user?.email
            if (!email) return
            supabase.from('referrals').select('pending_earnings').eq('user_id', referrerId).maybeSingle().then(({ data: ref }) => {
              supabase.from('profiles').select('username').eq('id', referrerId).maybeSingle().then(({ data: prof }) => {
                sendNotificationEmail(email, 'referralEarning', {
                  referrerName: (prof as { username?: string } | null)?.username || email.split('@')[0],
                  commissionGHS: commGHS,
                  totalPendingGHS: Number((ref as { pending_earnings?: number } | null)?.pending_earnings ?? commGHS),
                  dashboardUrl: 'https://gavelgh.com/referrals',
                }).catch(() => {})
              })
            })
          }).catch(() => {})
        }
      }
    }

    // Handle swap deposit payment
    if (metadata?.type === 'swap_deposit' && metadata?.submission_id && metadata?.user_id) {
      const submission_id = String(metadata.submission_id)
      const user_id = String(metadata.user_id)
      const reference = event.data?.reference

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
            deposit_payment_reference: reference ?? null,
            status: 'pending_review',
          })
          .eq('id', submission_id)

        await queueSwapSubmissionReceivedNotification({
          userId: user_id,
          submissionId: submission_id,
        })
      }
    }
  }

  // Handle transfer.success - Payout successfully sent to seller
  if (event.event === 'transfer.success') {
    const { reference, transfer_code, recipient } = event.data || {}

    if (reference && transfer_code) {
      // Extract payout_id from reference (format: payout_{id}_{timestamp})
      const parts = reference.split('_')
      if (parts.length >= 3 && parts[0] === 'payout') {
        const payout_id = parts[1]

        const { error } = await supabase
          .from('payouts')
          .update({ status: 'success' })
          .eq('id', payout_id)

        if (error) {
          console.error('Failed to update payout status to success:', error)
        } else {
          const { data: payout } = await supabase
            .from('payouts')
            .select('seller_id, payout_amount')
            .eq('id', payout_id)
            .maybeSingle<{ seller_id: string; payout_amount: number }>()

          if (payout?.seller_id) {
            await queuePayoutSuccessNotification({
              sellerUserId: payout.seller_id,
              amount: payout.payout_amount,
            })
          }
        }
      }
    }
  }

  // Handle transfer.failed - Payout transfer failed
  if (event.event === 'transfer.failed') {
    const { reference, transfer_code } = event.data || {}

    if (reference) {
      const parts = reference.split('_')
      if (parts.length >= 3 && parts[0] === 'payout') {
        const payout_id = parts[1]

        const { error } = await supabase
          .from('payouts')
          .update({ status: 'failed' })
          .eq('id', payout_id)

        if (error) {
          console.error('Failed to update payout status to failed:', error)
        } else {
          const { data: payout } = await supabase
            .from('payouts')
            .select('seller_id')
            .eq('id', payout_id)
            .maybeSingle<{ seller_id: string }>()

          if (payout?.seller_id) {
            await queuePayoutFailedNotification({ sellerUserId: payout.seller_id })
          }
        }
      }
    }
  }

  // Handle transfer.reversed - Payout transfer was reversed
  if (event.event === 'transfer.reversed') {
    const { reference, transfer_code } = event.data || {}

    if (reference) {
      const parts = reference.split('_')
      if (parts.length >= 3 && parts[0] === 'payout') {
        const payout_id = parts[1]

        const { error } = await supabase
          .from('payouts')
          .update({ status: 'reversed' })
          .eq('id', payout_id)

        if (error) {
          console.error('Failed to update payout status to reversed:', error)
        } else {
          const { data: payout } = await supabase
            .from('payouts')
            .select('seller_id')
            .eq('id', payout_id)
            .maybeSingle<{ seller_id: string }>()

          if (payout?.seller_id) {
            await queuePayoutReversedNotification({ sellerUserId: payout.seller_id })
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
