import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

type DeliveryRow = {
  item_id: string
  order_id: string
  order_created_at: string
  order_total_amount: number
  buyer_email: string | null
  buyer_full_name: string | null
  buyer_phone: string | null
  delivery_address: string | null
  delivery_city: string | null
  delivery_notes: string | null
  product_title: string
  quantity: number
  unit_price: number
  delivered_by_seller: boolean
  delivered_at: string | null
  seller_name: string | null
  seller_phone: string | null
  seller_shop_name: string | null
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

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: orders, error: ordersError } = await service
    .from('shop_orders')
    .select('id, status, created_at, total_amount, buyer_email, buyer_full_name, buyer_phone, delivery_address, delivery_city, delivery_notes')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(300)

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 })
  }

  const orderRows = orders ?? []
  const orderIds = orderRows.map((order) => String(order.id))

  if (orderIds.length === 0) {
    return NextResponse.json({ deliveries: [] })
  }

  const { data: items, error: itemsError } = await service
    .from('shop_order_items')
    .select('id, order_id, title_snapshot, quantity, unit_price, delivered_by_seller, delivered_at, seller_name, seller_phone, seller_shop_name, seller_payout_provider, seller_payout_account_name, seller_payout_account_number')
    .in('order_id', orderIds)

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  const orderById = new Map(orderRows.map((order) => [String(order.id), order]))

  const deliveries: DeliveryRow[] = (items ?? [])
    .map((item) => {
      const order = orderById.get(String(item.order_id))
      if (!order) return null

      return {
        item_id: String(item.id),
        order_id: String(order.id),
        order_created_at: String(order.created_at),
        order_total_amount: Number(order.total_amount ?? 0),
        buyer_email: (order.buyer_email as string | null) ?? null,
        buyer_full_name: (order.buyer_full_name as string | null) ?? null,
        buyer_phone: (order.buyer_phone as string | null) ?? null,
        delivery_address: (order.delivery_address as string | null) ?? null,
        delivery_city: (order.delivery_city as string | null) ?? null,
        delivery_notes: (order.delivery_notes as string | null) ?? null,
        product_title: String(item.title_snapshot || 'Product'),
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? 0),
        delivered_by_seller: Boolean(item.delivered_by_seller),
        delivered_at: (item.delivered_at as string | null) ?? null,
        seller_name: (item.seller_name as string | null) ?? null,
        seller_phone: (item.seller_phone as string | null) ?? null,
        seller_shop_name: (item.seller_shop_name as string | null) ?? null,
        seller_payout_provider: (item.seller_payout_provider as string | null) ?? null,
        seller_payout_account_name: (item.seller_payout_account_name as string | null) ?? null,
        seller_payout_account_number: (item.seller_payout_account_number as string | null) ?? null,
      }
    })
    .filter((row): row is DeliveryRow => row !== null)

  return NextResponse.json({ deliveries })
}
