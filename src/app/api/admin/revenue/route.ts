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

  const paidOrderIds = (paidOrders ?? []).map((order) => String(order.id))
  let productSales = 0

  if (paidOrderIds.length > 0) {
    const { data: orderItems, error: orderItemsError } = await service
      .from('shop_order_items')
      .select('unit_price, quantity')
      .in('order_id', paidOrderIds)
      .limit(10000)

    if (orderItemsError) {
      return NextResponse.json({ error: orderItemsError.message }, { status: 500 })
    }

    productSales = (orderItems ?? []).reduce(
      (sum, item) => sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
      0
    )
  }

  const { data: paidAuctions, error: paidAuctionsError } = await service
    .from('auctions')
    .select('id, current_price')
    .eq('paid', true)
    .limit(3000)

  if (paidAuctionsError) {
    return NextResponse.json({ error: paidAuctionsError.message }, { status: 500 })
  }

  const paidAuctionIds = (paidAuctions ?? []).map((auction) => String(auction.id))
  let auctionSales = 0

  if (paidAuctionIds.length > 0) {
    const { data: auctionPayments, error: paymentsError } = await service
      .from('payments')
      .select('auction_id, amount, status')
      .in('auction_id', paidAuctionIds)
      .eq('status', 'success')
      .limit(10000)

    if (!paymentsError) {
      const paymentByAuction = new Map<string, number>()
      for (const payment of auctionPayments ?? []) {
        const auctionId = String(payment.auction_id || '')
        if (!auctionId || paymentByAuction.has(auctionId)) continue
        paymentByAuction.set(auctionId, Number(payment.amount ?? 0))
      }

      for (const auction of paidAuctions ?? []) {
        const auctionId = String(auction.id)
        const amount = paymentByAuction.get(auctionId) ?? Number(auction.current_price ?? 0)
        auctionSales += amount
      }
    } else {
      auctionSales = (paidAuctions ?? []).reduce((sum, auction) => sum + Number(auction.current_price ?? 0), 0)
    }
  }

  const websiteRevenue = productSales + auctionSales
  const gavelRevenue = productSales * 0.1
  const paystackFee = gavelRevenue * 0.0195
  const gavelProfit = gavelRevenue - paystackFee

  return NextResponse.json({
    summary: {
      productSales,
      auctionSales,
      websiteRevenue,
      gavelRevenue,
      paystackFee,
      gavelProfit,
    },
  })
}
