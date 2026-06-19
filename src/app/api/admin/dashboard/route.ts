import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

type SellerSummary = {
  userId: string
  name: string
  phone: string
  totalProducts: number
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

  const { data: me } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    { data: users },
    { data: auctions },
    { data: approvedApplications },
  ] = await Promise.all([
    service
      .from('profiles')
      .select('id, username, phone, token_balance, role')
      .order('id', { ascending: true })
      .limit(200),
    service
      .from('auctions')
      .select('id, title, status, current_price, reserve_price, starts_at, ends_at, sale_source, seller_name, seller_phone, seller_expected_amount, description, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    service
      .from('seller_applications')
      .select('user_id, business_name, phone, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  const latestApprovedByUser = new Map<string, { user_id: string; business_name: string | null; phone: string | null }>()

  for (const application of approvedApplications ?? []) {
    if (!application.user_id) continue
    if (!latestApprovedByUser.has(application.user_id)) {
      latestApprovedByUser.set(application.user_id, application)
    }
  }

  const sellerUserIds = Array.from(latestApprovedByUser.keys())

  let sellerProfiles: Array<{ id: string; username: string | null; phone: string | null }> = []
  let sellerShops: Array<{ owner_id: string; name: string | null }> = []
  let sellerProducts: Array<{ created_by: string | null }> = []

  if (sellerUserIds.length > 0) {
    const [{ data: profiles }, { data: shops }, { data: products }] = await Promise.all([
      service
        .from('profiles')
        .select('id, username, phone')
        .in('id', sellerUserIds),
      service
        .from('shops')
        .select('owner_id, name')
        .in('owner_id', sellerUserIds)
        .eq('status', 'active'),
      service
        .from('shop_products')
        .select('created_by')
        .in('created_by', sellerUserIds)
        .neq('status', 'archived'),
    ])

    sellerProfiles = profiles ?? []
    sellerShops = shops ?? []
    sellerProducts = products ?? []
  }

  const profileMap = new Map(sellerProfiles.map((profile) => [profile.id, profile]))
  const shopNameMap = new Map<string, string>()

  for (const shop of sellerShops) {
    if (!shop.owner_id || !shop.name) continue
    if (!shopNameMap.has(shop.owner_id)) {
      shopNameMap.set(shop.owner_id, shop.name)
    }
  }

  const productCountMap = new Map<string, number>()

  for (const product of sellerProducts) {
    if (!product.created_by) continue
    productCountMap.set(product.created_by, (productCountMap.get(product.created_by) ?? 0) + 1)
  }

  const sellers: SellerSummary[] = sellerUserIds.map((userId) => {
    const approved = latestApprovedByUser.get(userId)
    const profile = profileMap.get(userId)
    const name =
      (shopNameMap.get(userId) ?? '').trim() ||
      (profile?.username ?? '').trim() ||
      (approved?.business_name ?? '').trim() ||
      'Seller'
    const phone =
      (profile?.phone ?? '').trim() ||
      (approved?.phone ?? '').trim() ||
      '-'
    return {
      userId,
      name,
      phone,
      totalProducts: productCountMap.get(userId) ?? 0,
    }
  })

  // Recent purchases with seller payout details
  const purchases: Array<{
    orderId: string
    orderCreatedAt: string
    orderTotalAmount: number
    productTitle: string
    quantity: number
    sellerName: string | null
    sellerShopName: string | null
    sellerPayoutProvider: string | null
    sellerPayoutAccountName: string | null
    sellerPayoutAccountNumber: string | null
  }> = []

  const { data: orders, error: ordersError } = await service
    .from('shop_orders')
    .select('id, created_at, total_amount')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(60)

  if (!ordersError && orders && orders.length > 0) {
    const orderIds = orders.map((order) => String(order.id))
    const orderById = new Map(orders.map((order) => [String(order.id), order]))

    const { data: items, error: itemsError } = await service
      .from('shop_order_items')
      .select('order_id, title_snapshot, quantity, seller_name, seller_shop_name, seller_payout_provider, seller_payout_account_name, seller_payout_account_number')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })
      .limit(160)

    if (!itemsError) {
      for (const item of items ?? []) {
        const order = orderById.get(String(item.order_id))
        if (!order) continue

        purchases.push({
          orderId: String(item.order_id),
          orderCreatedAt: String(order.created_at ?? ''),
          orderTotalAmount: Number(order.total_amount ?? 0),
          productTitle: String(item.title_snapshot || 'Product'),
          quantity: Number(item.quantity ?? 0) || 1,
          sellerName: (item.seller_name as string | null) ?? null,
          sellerShopName: (item.seller_shop_name as string | null) ?? null,
          sellerPayoutProvider: (item.seller_payout_provider as string | null) ?? null,
          sellerPayoutAccountName: (item.seller_payout_account_name as string | null) ?? null,
          sellerPayoutAccountNumber: (item.seller_payout_account_number as string | null) ?? null,
        })
      }
    }
  }

  // ── Safeguard: detect auctions that ended with qualifying bids but were never
  // assigned a winner. This is the exact signature of the settlement bug. It
  // should normally be empty; if not, settlement failed and the dashboard banner
  // surfaces it immediately. We allow a 1-hour grace period for the settle cron.
  const stuckAuctions: Array<{
    id: string
    title: string
    topBid: number
    bidCount: number
    reservePrice: number | null
    endsAt: string | null
  }> = []

  const graceCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: unsettled } = await service
    .from('auctions')
    .select('id, title, reserve_price, ends_at')
    .eq('status', 'ended')
    .eq('paid', false)
    .is('winner_id', null)
    .is('winning_bid_id', null)
    .lt('ends_at', graceCutoff)
    .order('ends_at', { ascending: false })
    .limit(50)

  if (unsettled && unsettled.length > 0) {
    const ids = unsettled.map((a) => a.id)
    const { data: bidRows } = await service
      .from('bids')
      .select('auction_id, amount')
      .in('auction_id', ids)

    const maxByAuction = new Map<string, number>()
    const countByAuction = new Map<string, number>()
    for (const bid of bidRows ?? []) {
      const aid = String(bid.auction_id)
      const amt = Number(bid.amount)
      countByAuction.set(aid, (countByAuction.get(aid) ?? 0) + 1)
      maxByAuction.set(aid, Math.max(maxByAuction.get(aid) ?? 0, Number.isFinite(amt) ? amt : 0))
    }

    for (const auction of unsettled) {
      const bidCount = countByAuction.get(auction.id) ?? 0
      if (bidCount === 0) continue // no bids → legitimately no winner
      const topBid = maxByAuction.get(auction.id) ?? 0
      const reserve = auction.reserve_price == null ? 0 : Number(auction.reserve_price)
      // Reserve not met → legitimately no winner; only flag when a winner SHOULD exist.
      if (topBid < reserve) continue
      stuckAuctions.push({
        id: auction.id,
        title: auction.title,
        topBid,
        bidCount,
        reservePrice: auction.reserve_price,
        endsAt: auction.ends_at,
      })
    }
  }

  return NextResponse.json({
    users: users ?? [],
    auctions: auctions ?? [],
    sellers,
    purchases,
    stuckAuctions,
  })
}
