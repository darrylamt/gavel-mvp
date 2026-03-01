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

  if (profile?.role !== 'admin') {
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
    let paymentsQuery = service
      .from('payments')
      .select('auction_id, amount, status')
      .in('auction_id', paidAuctionIds)
      .eq('status', 'success')
      .limit(10000)

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

      for (const auction of paidAuctions ?? []) {
        const auctionId = String(auction.id)
        const amount = paymentByAuction.get(auctionId) ?? Number(auction.current_price ?? 0)
        auctionSales += amount
      }
    } else if (!periodStart) {
      auctionSales = (paidAuctions ?? []).reduce((sum, auction) => sum + Number(auction.current_price ?? 0), 0)
    }
  }

  // Token purchases
  const tokenPackMap = new Map<number, number>([
    [35, 10],
    [120, 30],
    [250, 55],
  ])

  let tokenQuery = service
    .from('token_transactions')
    .select('amount, purchase_amount, purchase_currency, created_at, type')
    .eq('type', 'purchase')
    .limit(5000)

  if (periodStart) {
    tokenQuery = tokenQuery.gte('created_at', periodStart)
  }

  const { data: tokenTransactions, error: tokenError } = await tokenQuery

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 })
  }

  const tokenSales = (tokenTransactions ?? []).reduce((sum, txn) => {
    // Prefer persisted purchase_amount, otherwise derive from known packs
    const recordedAmount = Number((txn as { purchase_amount?: number | null }).purchase_amount ?? 0)
    if (Number.isFinite(recordedAmount) && recordedAmount > 0) {
      return sum + recordedAmount
    }

    const tokens = Number((txn as { amount?: number | null }).amount ?? 0)
    const mapped = tokenPackMap.get(tokens)
    if (mapped != null) {
      return sum + mapped
    }

    const fallbackRate = 10 / 35 // use smallest pack rate as conservative default
    return sum + Number((tokens * fallbackRate).toFixed(2))
  }, 0)

  const websiteRevenue = productSales + auctionSales + tokenSales
  const productMarkup = productSales * 0.1
  const gavelRevenue = productMarkup + tokenSales
  const paystackFee = gavelRevenue * 0.0195
  const gavelProfit = gavelRevenue - paystackFee

  return NextResponse.json({
    summary: {
      productSales,
      auctionSales,
      tokenSales,
      websiteRevenue,
      gavelRevenue,
      paystackFee,
      gavelProfit,
    },
    period: period ?? 'all',
  })
}
