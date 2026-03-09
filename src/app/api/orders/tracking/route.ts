import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const trackingNumber = searchParams.get('tracking')

  if (!trackingNumber) {
    return NextResponse.json({ error: 'Tracking number required' }, { status: 400 })
  }

  try {
    // Fetch order with tracking number
    const { data: order, error: orderError } = await service
      .from('shop_orders')
      .select(`
        id,
        tracking_number,
        tracking_status,
        tracking_history,
        total_amount,
        delivery_address,
        estimated_delivery_date,
        actual_delivery_date,
        delivered,
        delivery_confirmed_at,
        created_at,
        user_id
      `)
      .eq('tracking_number', trackingNumber)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Fetch customer details
    const { data: customer } = await service
      .from('profiles')
      .select('username, phone')
      .eq('id', order.user_id)
      .single()

    // Fetch order items with seller details
    const { data: items, error: itemsError } = await service
      .from('shop_order_items')
      .select(`
        id,
        title_snapshot,
        quantity,
        unit_price,
        seller_id,
        seller_name,
        seller_phone,
        seller_tracking_status,
        delivered_by_seller,
        delivered_at
      `)
      .eq('order_id', order.id)

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 })
    }

    // Group items by seller
    const sellerGroups = new Map()
    for (const item of items || []) {
      const sellerId = item.seller_id || 'unknown'
      if (!sellerGroups.has(sellerId)) {
        sellerGroups.set(sellerId, {
          seller_id: item.seller_id,
          seller_name: item.seller_name || 'Seller',
          seller_phone: item.seller_phone,
          tracking_status: item.seller_tracking_status,
          items: [],
        })
      }
      sellerGroups.get(sellerId).items.push({
        title: item.title_snapshot,
        quantity: item.quantity,
        unit_price: item.unit_price,
        delivered: item.delivered_by_seller,
        delivered_at: item.delivered_at,
      })
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        tracking_number: order.tracking_number,
        status: order.tracking_status,
        history: order.tracking_history || [],
        total_amount: order.total_amount,
        delivery_address: order.delivery_address,
        estimated_delivery: order.estimated_delivery_date,
        actual_delivery: order.actual_delivery_date,
        delivered: order.delivered,
        delivery_confirmed_at: order.delivery_confirmed_at,
        created_at: order.created_at,
        customer: {
          name: customer?.username || 'Customer',
          phone: customer?.phone,
        },
        sellers: Array.from(sellerGroups.values()),
      },
    })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracking information' },
      { status: 500 }
    )
  }
}
