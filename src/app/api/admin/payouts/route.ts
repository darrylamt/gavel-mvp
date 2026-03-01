import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

type PayoutRow = {
  seller_id: string | null
  seller_name: string | null
  seller_shop_name: string | null
  seller_phone: string | null
  seller_payout_provider: string | null
  seller_payout_account_name: string | null
  seller_payout_account_number: string | null
  quantity: number
  unit_price: number
}

type PayoutSummary = {
  key: string
  seller_id: string | null
  seller_name: string
  seller_shop_name: string
  seller_phone: string
  payout_provider: string
  payout_account_name: string
  payout_account_number: string
  items_sold: number
  gross_sales: number
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

  const { data: paidOrders, error: paidOrdersError } = await service
    .from('shop_orders')
    .select('id')
    .eq('status', 'paid')
    .limit(5000)

  if (paidOrdersError) {
    return NextResponse.json({ error: paidOrdersError.message }, { status: 500 })
  }

  const orderIds = (paidOrders ?? []).map((order) => String(order.id))
  if (orderIds.length === 0) {
    return NextResponse.json({ payouts: [] })
  }

  const { data: rows, error: rowsError } = await service
    .from('shop_order_items')
    .select('seller_id, seller_name, seller_shop_name, seller_phone, seller_payout_provider, seller_payout_account_name, seller_payout_account_number, quantity, unit_price')
    .in('order_id', orderIds)
    .limit(10000)

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 })
  }

  const map = new Map<string, PayoutSummary>()

  for (const row of (rows ?? []) as PayoutRow[]) {
    const sellerId = row.seller_id ? String(row.seller_id) : null
    const provider = String(row.seller_payout_provider || 'N/A')
    const accountNumber = String(row.seller_payout_account_number || 'No account number')
    const key = `${sellerId || 'unknown'}|${provider}|${accountNumber}`

    const existing = map.get(key) ?? {
      key,
      seller_id: sellerId,
      seller_name: String(row.seller_name || 'Seller'),
      seller_shop_name: String(row.seller_shop_name || 'N/A'),
      seller_phone: String(row.seller_phone || 'No phone'),
      payout_provider: provider,
      payout_account_name: String(row.seller_payout_account_name || 'No account name'),
      payout_account_number: accountNumber,
      items_sold: 0,
      gross_sales: 0,
    }

    const quantity = Number(row.quantity ?? 0)
    const unitPrice = Number(row.unit_price ?? 0)
    existing.items_sold += quantity
    existing.gross_sales += quantity * unitPrice

    map.set(key, existing)
  }

  const payouts = Array.from(map.values()).sort((a, b) => b.gross_sales - a.gross_sales)

  return NextResponse.json({ payouts })
}
