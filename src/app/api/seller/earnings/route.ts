import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return unauthorized()
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return unauthorized()
  }

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'seller' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: orderItems, error: orderItemsError } = await service
    .from('shop_order_items')
    .select('order_id, unit_price, quantity')
    .eq('seller_id', user.id)
    .limit(5000)

  if (orderItemsError) {
    return NextResponse.json({ error: orderItemsError.message }, { status: 500 })
  }

  const orderIds = Array.from(new Set((orderItems ?? []).map((item) => String(item.order_id)).filter(Boolean)))
  let paidOrderIds = new Set<string>()

  if (orderIds.length > 0) {
    const { data: paidOrders, error: paidOrdersError } = await service
      .from('shop_orders')
      .select('id, status')
      .in('id', orderIds)
      .eq('status', 'paid')

    if (paidOrdersError) {
      return NextResponse.json({ error: paidOrdersError.message }, { status: 500 })
    }

    paidOrderIds = new Set((paidOrders ?? []).map((row) => String(row.id)))
  }

  const productSales = (orderItems ?? []).reduce((sum, item) => {
    const orderId = String(item.order_id || '')
    if (!paidOrderIds.has(orderId)) return sum
    return sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0)
  }, 0)

  const { data: sellerAuctions, error: sellerAuctionsError } = await service
    .from('auctions')
    .select('id, paid, current_price')
    .eq('seller_id', user.id)
    .eq('paid', true)
    .limit(2000)

  if (sellerAuctionsError) {
    return NextResponse.json({ error: sellerAuctionsError.message }, { status: 500 })
  }

  const paidAuctionIds = (sellerAuctions ?? []).map((auction) => String(auction.id))
  let auctionSales = 0

  if (paidAuctionIds.length > 0) {
    const { data: auctionPayments, error: paymentsError } = await service
      .from('payments')
      .select('auction_id, amount, status')
      .in('auction_id', paidAuctionIds)
      .eq('status', 'success')
      .limit(5000)

    if (!paymentsError) {
      const paymentByAuction = new Map<string, number>()
      for (const payment of auctionPayments ?? []) {
        const auctionId = String(payment.auction_id || '')
        if (!auctionId || paymentByAuction.has(auctionId)) continue
        paymentByAuction.set(auctionId, Number(payment.amount ?? 0))
      }

      for (const auction of sellerAuctions ?? []) {
        const auctionId = String(auction.id)
        const amount = paymentByAuction.get(auctionId) ?? Number(auction.current_price ?? 0)
        auctionSales += amount
      }
    } else {
      auctionSales = (sellerAuctions ?? []).reduce((sum, auction) => sum + Number(auction.current_price ?? 0), 0)
    }
  }

  const totalEarnings = productSales + auctionSales

  return NextResponse.json({
    summary: {
      productSales,
      auctionSales,
      totalEarnings,
    },
  })
}
