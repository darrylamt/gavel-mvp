import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
  }

  const token = authHeader.replace(/^Bearer\s+/i, '')
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { order_id, item_id, status, description, location } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Verify seller owns the item
    if (item_id) {
      const { data: item } = await service
        .from('shop_order_items')
        .select('seller_id, order_id')
        .eq('id', item_id)
        .single()

      if (!item || item.seller_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Update item status
      const { error: updateError } = await service
        .from('shop_order_items')
        .update({
          seller_tracking_status: status,
          delivered_by_seller: status === 'delivered',
          delivered_at: status === 'delivered' ? new Date().toISOString() : null,
        })
        .eq('id', item_id)

      if (updateError) {
        console.error('Failed to update item:', updateError)
        return NextResponse.json({ error: 'Failed to update item status' }, { status: 500 })
      }

      // When seller confirms delivery, reduce payout hold from 5 days to 3 days
      if (status === 'delivered' && item.order_id) {
        const newScheduledRelease = new Date()
        newScheduledRelease.setDate(newScheduledRelease.getDate() + 3) // 3 days from seller confirmation

        // Update pending payouts for this order and seller
        const { error: payoutUpdateError } = await service
          .from('payouts')
          .update({
            scheduled_release_at: newScheduledRelease.toISOString(),
          })
          .eq('order_id', item.order_id)
          .eq('seller_id', user.id)
          .eq('status', 'pending')
          .is('released_at', null) // Only update if not yet released

        if (payoutUpdateError) {
          console.error('Failed to update payout schedule:', payoutUpdateError)
          // Don't fail the request - tracking update is still successful
        } else {
          console.log('Payout schedule updated to 3 days for seller:', user.id, 'order:', item.order_id)
        }
      }
    }

    // Update order tracking if order_id provided
    if (order_id) {
      // Add tracking history entry
      const { error: historyError } = await service.rpc('add_tracking_history', {
        p_order_id: order_id,
        p_status: status,
        p_description: description || `Order ${status.replace('_', ' ')}`,
        p_location: location || null,
        p_updated_by: user.id,
      })

      if (historyError) {
        console.error('Failed to add tracking history:', historyError)
        return NextResponse.json({ error: 'Failed to update order tracking' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Order status updated' })
  } catch (error) {
    console.error('Update tracking error:', error)
    return NextResponse.json({ error: 'Failed to update tracking status' }, { status: 500 })
  }
}

// GET endpoint for sellers to fetch their orders
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
  }

  const token = authHeader.replace(/^Bearer\s+/i, '')
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all order items for this seller
    const { data: items, error: itemsError } = await service
      .from('shop_order_items')
      .select(`
        id,
        order_id,
        title_snapshot,
        quantity,
        unit_price,
        seller_tracking_status,
        delivered_by_seller,
        delivered_at,
        created_at,
        order:order_id (
          id,
          tracking_number,
          tracking_status,
          total_amount,
          delivery_address,          buyer_full_name,
          buyer_phone,          created_at,
          user_id
        )
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (itemsError) {
      console.error('Failed to fetch items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Fetch customer details for each unique user
    const userIds = [
      ...new Set(
        items?.map((item: any) => {
          const order = Array.isArray(item.order) ? item.order[0] : item.order
          return order?.user_id
        }).filter(Boolean)
      ),
    ]
    const { data: customers } = await service
      .from('profiles')
      .select('id, username, phone')
      .in('id', userIds)

    const customerMap = new Map(customers?.map((c) => [c.id, c]) || [])

    // Group items by order
    const ordersMap = new Map()
    for (const item of items || []) {
      // Handle order as either array or object (Supabase may return either format)
      const order = Array.isArray(item.order) ? item.order[0] : item.order
      if (!order) continue

      const orderId = order.id
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          id: order.id,
          tracking_number: order.tracking_number,
          tracking_status: order.tracking_status,
          total_amount: order.total_amount,
          delivery_address: order.delivery_address,
          buyer_full_name: order.buyer_full_name,
          buyer_phone: order.buyer_phone,
          created_at: order.created_at,
          customer: customerMap.get(order.user_id) || { username: 'Customer' },
          items: [],
        })
      }

      ordersMap.get(orderId).items.push({
        id: item.id,
        title: item.title_snapshot,
        quantity: item.quantity,
        unit_price: item.unit_price,
        status: item.seller_tracking_status,
        delivered: item.delivered_by_seller,
        delivered_at: item.delivered_at,
      })
    }

    return NextResponse.json({
      success: true,
      orders: Array.from(ordersMap.values()),
    })
  } catch (error) {
    console.error('Fetch orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
