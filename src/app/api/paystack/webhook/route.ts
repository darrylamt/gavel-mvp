import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'


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
  const event = JSON.parse(body)

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
          console.log('Payout marked as success:', payout_id)

          // TODO: Notify seller
          // const { data: payout } = await supabase
          //   .from('payouts')
          //   .select('seller_id, payout_amount')
          //   .eq('id', payout_id)
          //   .single()
          //
          // if (payout) {
          //   await queueSellerNotification({
          //     userId: payout.seller_id,
          //     message: `Your payout of GHS ${payout.payout_amount} has been sent! 🎉`
          //   })
          // }
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
          console.log('Payout marked as failed:', payout_id)

          // TODO: Notify seller and flag for admin review
          // const { data: payout } = await supabase
          //   .from('payouts')
          //   .select('seller_id')
          //   .eq('id', payout_id)
          //   .single()
          //
          // if (payout) {
          //   await queueSellerNotification({
          //     userId: payout.seller_id,
          //     message: 'There was an issue with your payout. Our team will resolve this within 24 hours.'
          //   })
          // }
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
          console.log('Payout marked as reversed:', payout_id)

          // TODO: Flag for admin review and notify seller
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
