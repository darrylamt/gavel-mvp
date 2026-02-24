import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { queueBuyerDeliveredNotification } from '@/lib/whatsapp/events'

type SellerDeliveryRow = {
  item_id: string
  order_id: string
  order_created_at: string
  buyer_full_name: string | null
  buyer_phone: string | null
  buyer_email: string | null
  delivery_address: string | null
  delivery_city: string | null
  delivery_notes: string | null
  product_title: string
  quantity: number
  unit_price: number
  delivered_by_seller: boolean
  delivered_at: string | null
  seller_payout_provider: string | null
  seller_payout_account_name: string | null
  seller_payout_account_number: string | null
}

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'seller') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: items, error: itemsError } = await service
    .from('shop_order_items')
    .select('id, order_id, title_snapshot, quantity, unit_price, delivered_by_seller, delivered_at, seller_payout_provider, seller_payout_account_name, seller_payout_account_number')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  const itemRows = items ?? []
  const orderIds = Array.from(new Set(itemRows.map((item) => String(item.order_id)).filter(Boolean)))

  if (orderIds.length === 0) {
    return NextResponse.json({ deliveries: [] })
  }

  const { data: orders, error: ordersError } = await service
    .from('shop_orders')
    .select('id, status, created_at, buyer_full_name, buyer_phone, buyer_email, delivery_address, delivery_city, delivery_notes')
    .in('id', orderIds)

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 })
  }

  const orderById = new Map((orders ?? []).map((order) => [String(order.id), order]))

  const deliveries: SellerDeliveryRow[] = itemRows
    .map((item) => {
      const order = orderById.get(String(item.order_id))
      if (!order) return null
      if (String(order.status || '') !== 'paid') return null

      return {
        item_id: String(item.id),
        order_id: String(order.id),
        order_created_at: String(order.created_at),
        buyer_full_name: (order.buyer_full_name as string | null) ?? null,
        buyer_phone: (order.buyer_phone as string | null) ?? null,
        buyer_email: (order.buyer_email as string | null) ?? null,
        delivery_address: (order.delivery_address as string | null) ?? null,
        delivery_city: (order.delivery_city as string | null) ?? null,
        delivery_notes: (order.delivery_notes as string | null) ?? null,
        product_title: String(item.title_snapshot || 'Product'),
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? 0),
        delivered_by_seller: Boolean(item.delivered_by_seller),
        delivered_at: (item.delivered_at as string | null) ?? null,
        seller_payout_provider: (item.seller_payout_provider as string | null) ?? null,
        seller_payout_account_name: (item.seller_payout_account_name as string | null) ?? null,
        seller_payout_account_number: (item.seller_payout_account_number as string | null) ?? null,
      }
    })
    .filter((row): row is SellerDeliveryRow => row !== null)

  return NextResponse.json({ deliveries })
}

export async function PATCH(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'seller') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const itemId = typeof body?.item_id === 'string' ? body.item_id.trim() : ''

  if (!itemId) {
    return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
  }

  const { data: existingItem } = await service
    .from('shop_order_items')
    .select('id, order_id, title_snapshot, seller_id')
    .eq('id', itemId)
    .eq('seller_id', user.id)
    .maybeSingle<{ id: string; order_id: string; title_snapshot: string | null; seller_id: string }>()

  if (!existingItem) {
    return NextResponse.json({ error: 'Delivery item not found' }, { status: 404 })
  }

  const { data: updated, error: updateError } = await service
    .from('shop_order_items')
    .update({
      delivered_by_seller: true,
      delivered_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('seller_id', user.id)
    .select('id, delivered_by_seller, delivered_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: order } = await service
    .from('shop_orders')
    .select('id, user_id')
    .eq('id', existingItem.order_id)
    .maybeSingle<{ id: string; user_id: string | null }>()

  if (order?.user_id) {
    await queueBuyerDeliveredNotification({
      buyerUserId: order.user_id,
      orderId: String(order.id),
      productTitle: String(existingItem.title_snapshot || 'Product'),
    })
  }

  return NextResponse.json({ item: updated })
}
