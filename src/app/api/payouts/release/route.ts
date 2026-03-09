import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Admin endpoint to release a held payout
 */
export async function POST(req: Request) {
  try {
    const { payout_id, admin_id } = await req.json()

    if (!payout_id || !admin_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify admin
    const { data: admin } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', admin_id)
      .single()

    if (!admin?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      )
    }

    // Fetch payout
    const { data: payout, error: fetchError } = await supabase
      .from('payouts')
      .select('*, order_id, auction_id, seller_id')
      .eq('id', payout_id)
      .single()

    if (fetchError || !payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      )
    }

    // Can only release held payouts
    if (payout.status !== 'on_hold') {
      return NextResponse.json(
        { error: `Cannot release payout with status: ${payout.status}` },
        { status: 400 }
      )
    }

    // Check if buyer has already confirmed delivery
    let deliveryConfirmed = false

    if (payout.order_id) {
      const { data: order } = await supabase
        .from('shop_orders')
        .select('delivered')
        .eq('id', payout.order_id)
        .single()

      deliveryConfirmed = order?.delivered ?? false
    } else if (payout.auction_id) {
      const { data: auction } = await supabase
        .from('auctions')
        .select('delivered')
        .eq('id', payout.auction_id)
        .single()

      deliveryConfirmed = auction?.delivered ?? false
    }

    // If delivery confirmed, trigger payout immediately
    if (deliveryConfirmed) {
      const { error: updateError } = await supabase
        .from('payouts')
        .update({
          status: 'pending',
          hold_reason: null,
          held_by: null,
          held_at: null,
          payout_trigger: 'admin_released',
        })
        .eq('id', payout_id)

      if (updateError) {
        console.error('Failed to release payout:', updateError)
        return NextResponse.json(
          { error: 'Failed to release payout' },
          { status: 500 }
        )
      }

      // Trigger immediate payout
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/payouts/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_id }),
      })

      // TODO: Notify seller
      // await queueSellerNotification({
      //   userId: payout.seller_id,
      //   message: 'Your payout hold has been lifted. Funds will be released shortly.'
      // })

      return NextResponse.json({
        success: true,
        message: 'Payout released and initiated',
      })
    } else {
      // If delivery not confirmed, reset to pending with new 5-day window
      const newScheduledRelease = new Date()
      newScheduledRelease.setDate(newScheduledRelease.getDate() + 5)

      const { error: updateError } = await supabase
        .from('payouts')
        .update({
          status: 'pending',
          hold_reason: null,
          held_by: null,
          held_at: null,
          scheduled_release_at: newScheduledRelease.toISOString(),
        })
        .eq('id', payout_id)

      if (updateError) {
        console.error('Failed to release payout:', updateError)
        return NextResponse.json(
          { error: 'Failed to release payout' },
          { status: 500 }
        )
      }

      // TODO: Notify seller
      // await queueSellerNotification({
      //   userId: payout.seller_id,
      //   message: 'Your payout hold has been lifted. Funds will be released in 5 days or when the buyer confirms delivery.'
      // })

      return NextResponse.json({
        success: true,
        message: 'Payout released with 5-day window',
      })
    }
  } catch (error) {
    console.error('Error releasing payout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
