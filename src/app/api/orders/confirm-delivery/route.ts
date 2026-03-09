import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Buyer confirms delivery for a shop order or auction
 * This triggers immediate payout if not on hold
 */
export async function POST(req: Request) {
  try {
    const { order_id, auction_id, buyer_id } = await req.json()

    if (!buyer_id) {
      return NextResponse.json(
        { error: 'Missing buyer_id' },
        { status: 400 }
      )
    }

    if (!order_id && !auction_id) {
      return NextResponse.json(
        { error: 'Must provide either order_id or auction_id' },
        { status: 400 }
      )
    }

    // Handle shop order confirmation
    if (order_id) {
      // Verify buyer owns this order
      const { data: order, error: orderError } = await supabase
        .from('shop_orders')
        .select('user_id, delivered')
        .eq('id', order_id)
        .single()

      if (orderError || !order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      if (order.user_id !== buyer_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }

      if (order.delivered) {
        return NextResponse.json(
          { message: 'Delivery already confirmed' },
          { status: 200 }
        )
      }

      // Mark order as delivered
      await supabase
        .from('shop_orders')
        .update({
          delivered: true,
          delivery_confirmed_at: new Date().toISOString(),
          delivery_confirmed_by: buyer_id,
        })
        .eq('id', order_id)

      // Find pending payouts for this order
      const { data: payouts, error: payoutsError } = await supabase
        .from('payouts')
        .select('id, status')
        .eq('order_id', order_id)
        .in('status', ['pending', 'on_hold'])

      if (!payoutsError && payouts && payouts.length > 0) {
        for (const payout of payouts) {
          if (payout.status === 'on_hold') {
            // Don't trigger payout, notify admin instead
            console.log('Order confirmed but payout on hold:', payout.id)
            // TODO: Notify admin
          } else if (payout.status === 'pending') {
            // Trigger payout immediately
            await supabase
              .from('payouts')
              .update({ payout_trigger: 'buyer_confirmed' })
              .eq('id', payout.id)

            // Initiate the transfer
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/payouts/initiate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payout_id: payout.id }),
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Delivery confirmed. Seller will receive payment shortly.',
      })
    }

    // Handle auction confirmation
    if (auction_id) {
      // Verify buyer is the winner
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .select('winner_id, delivered')
        .eq('id', auction_id)
        .single()

      if (auctionError || !auction) {
        return NextResponse.json(
          { error: 'Auction not found' },
          { status: 404 }
        )
      }

      if (auction.winner_id !== buyer_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }

      if (auction.delivered) {
        return NextResponse.json(
          { message: 'Delivery already confirmed' },
          { status: 200 }
        )
      }

      // Mark auction as delivered
      await supabase
        .from('auctions')
        .update({
          delivered: true,
          delivery_confirmed_at: new Date().toISOString(),
          delivery_confirmed_by: buyer_id,
        })
        .eq('id', auction_id)

      // Find pending payout for this auction
      const { data: payouts, error: payoutsError } = await supabase
        .from('payouts')
        .select('id, status')
        .eq('auction_id', auction_id)
        .in('status', ['pending', 'on_hold'])

      if (!payoutsError && payouts && payouts.length > 0) {
        for (const payout of payouts) {
          if (payout.status === 'on_hold') {
            console.log('Auction confirmed but payout on hold:', payout.id)
            // TODO: Notify admin
          } else if (payout.status === 'pending') {
            await supabase
              .from('payouts')
              .update({ payout_trigger: 'buyer_confirmed' })
              .eq('id', payout.id)

            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/payouts/initiate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payout_id: payout.id }),
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Delivery confirmed. Seller will receive payment shortly.',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error confirming delivery:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
