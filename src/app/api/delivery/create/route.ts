import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { dawuroboRequest, type DawuroboCreateOrderResponse } from '@/lib/dawurobo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/delivery/create
 * Seller-initiated: creates a Dawurobo delivery order for a shop order.
 * Requires Authorization: Bearer <seller_token>
 * Body: { order_id }
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authData.user.id
    const { order_id } = (await req.json()) as { order_id?: string }
    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from('shop_orders')
      .select('id, user_id, status, buyer_full_name, buyer_phone, delivery_address, delivery_city, delivery_region, delivery_notes, dawurobo_order_id, delivery_priority, delivery_fee')
      .eq('id', order_id)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'Order is not in paid status' }, { status: 400 })
    }

    if (order.dawurobo_order_id) {
      return NextResponse.json({ error: 'Delivery already dispatched for this order' }, { status: 409 })
    }

    const { data: sellerItems } = await supabase
      .from('shop_order_items')
      .select('id, title_snapshot, quantity')
      .eq('order_id', order_id)
      .eq('seller_id', userId)

    if (!sellerItems || sellerItems.length === 0) {
      return NextResponse.json({ error: 'You do not have items in this order' }, { status: 403 })
    }

    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('username, phone, address')
      .eq('id', userId)
      .maybeSingle()

    const { data: sellerShop } = await supabase
      .from('shops')
      .select('name')
      .eq('owner_id', userId)
      .limit(1)
      .maybeSingle()

    const pickupAddress = sellerProfile?.address ?? ''
    const pickupPhone = sellerProfile?.phone ?? ''
    const pickupName = sellerShop?.name || sellerProfile?.username || 'Seller'

    if (!pickupAddress) {
      return NextResponse.json(
        { error: 'Your profile address is not set. Please update your profile with a pickup address before dispatching.' },
        { status: 400 }
      )
    }

    if (!order.delivery_address || !order.buyer_phone) {
      return NextResponse.json({ error: 'Order is missing delivery address or buyer phone' }, { status: 400 })
    }

    const itemDescriptions = sellerItems
      .map((i) => `${i.quantity}x ${i.title_snapshot}`)
      .join(', ')

    const priority = String((order as Record<string, unknown>).delivery_priority || 'standard')

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

    const dawuroboPayload = {
      order_reference: `GAVEL-${order_id}`,
      customer: {
        name: order.buyer_full_name || 'Customer',
        phone: order.buyer_phone,
      },
      delivery: {
        address: order.delivery_address,
        city: order.delivery_city || '',
        region: (order as Record<string, unknown>).delivery_region as string || 'Greater Accra',
      },
      item: itemDescriptions,
      pickup: {
        address: pickupAddress,
        contact_person: pickupName,
        contact_phone: pickupPhone,
      },
      payment: {
        method: 'mobile_money',
        amount: Math.max(1, Number((order as Record<string, unknown>).delivery_fee) || 1),
        is_paid: true,
      },
      priority,
      webhook_url: `${siteUrl}/api/webhooks/dawurobo`,
      ...(order.delivery_notes ? { special_instructions: order.delivery_notes } : {}),
    }

    const response = await dawuroboRequest<DawuroboCreateOrderResponse>('POST', '/orders', dawuroboPayload)
    const dawuroboOrderId = response.data.order_details.order_id
    const dawuroboStatus = response.data.status || 'pending'

    await supabase
      .from('shop_orders')
      .update({
        dawurobo_order_id: dawuroboOrderId,
        dawurobo_status: dawuroboStatus,
      })
      .eq('id', order_id)

    await supabase.from('delivery_events').insert({
      order_id,
      status: dawuroboStatus,
      description: 'Delivery order created with Dawurobo',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      dawurobo_order_id: dawuroboOrderId,
      status: dawuroboStatus,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create delivery'
    console.error('[delivery/create] Error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
