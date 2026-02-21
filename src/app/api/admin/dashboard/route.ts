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

  const [{ data: users }, { data: auctions }, { data: approvedApplications }] = await Promise.all([
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
    const [{ data: profiles }, { data: products }] = await Promise.all([
      service
        .from('profiles')
        .select('id, username, phone')
        .in('id', sellerUserIds),
      service
        .from('active_seller_shops')
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

  const sellers: SellerSummary[] = sellerUserIds.flatMap((userId) => {
    const approved = latestApprovedByUser.get(userId)
    const profile = profileMap.get(userId)
    if (!shopNameMap.has(userId)) return []

    const name =
      (shopNameMap.get(userId) ?? '').trim() ||
      (profile?.username ?? '').trim() ||
      (approved?.business_name ?? '').trim() ||
      'Seller'

    const phone =
      (profile?.phone ?? '').trim() ||
      (approved?.phone ?? '').trim() ||
      '-'

    return [{
      userId,
      name,
      phone,
      totalProducts: productCountMap.get(userId) ?? 0,
    }]
  })

  return NextResponse.json({
    users: users ?? [],
    auctions: auctions ?? [],
    sellers,
  })
}
