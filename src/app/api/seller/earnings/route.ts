import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function resolvePeriodStart(period: string | null) {
  const now = Date.now()
  if (period === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  if (period === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  if (period === '90d') return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()
  return null
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

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period')
  const periodStart = resolvePeriodStart(period)

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

  let paidOrdersQuery = service.from('shop_orders').select('id').eq('status', 'paid').limit(5000)
  if (periodStart) {
    paidOrdersQuery = paidOrdersQuery.gte('created_at', periodStart)
  }

  const { data: paidOrders, error: paidOrdersError } = await paidOrdersQuery

  if (paidOrdersError) {
    return NextResponse.json({ error: paidOrdersError.message }, { status: 500 })
  }

  const paidOrderIds = (paidOrders ?? []).map((row) => String(row.id)).filter(Boolean)
  let productSales = 0

  if (paidOrderIds.length > 0) {
    const { data: orderItems, error: orderItemsError } = await service
      .from('shop_order_items')
      .select('unit_price, quantity')
      .eq('seller_id', user.id)
      .in('order_id', paidOrderIds)
      .limit(5000)

    if (orderItemsError) {
      return NextResponse.json({ error: orderItemsError.message }, { status: 500 })
    }

    productSales = (orderItems ?? []).reduce((sum, item) => {
      return sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0)
    }, 0)
  }

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
    let paymentsQuery = service
      .from('payments')
      .select('auction_id, amount, status')
      .in('auction_id', paidAuctionIds)
      .eq('status', 'success')
      .limit(5000)

    if (periodStart) {
      paymentsQuery = paymentsQuery.gte('created_at', periodStart)
    }

    const { data: auctionPayments, error: paymentsError } = await paymentsQuery

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
    } else if (!periodStart) {
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
    period: period ?? 'all',
  })
}
