import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseAuctionMeta } from '@/lib/auctionMeta'
import 'server-only'

type SellerSummary = {
  name: string
  phone: string
  totalAuctions: number
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

  const [{ data: users }, { data: auctions }] = await Promise.all([
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
  ])

  const sellerMap = new Map<string, SellerSummary>()

  for (const auction of auctions ?? []) {
    const source = auction.sale_source ?? parseAuctionMeta(auction.description).meta?.saleSource
    if (source !== 'seller') continue

    const fallbackMeta = parseAuctionMeta(auction.description).meta
    const name = (auction.seller_name ?? fallbackMeta?.sellerName ?? '').trim()
    const phone = (auction.seller_phone ?? fallbackMeta?.sellerPhone ?? '').trim()

    if (!name || !phone) continue

    const key = `${name}|${phone}`
    const existing = sellerMap.get(key)

    if (existing) {
      existing.totalAuctions += 1
    } else {
      sellerMap.set(key, {
        name,
        phone,
        totalAuctions: 1,
      })
    }
  }

  return NextResponse.json({
    users: users ?? [],
    auctions: auctions ?? [],
    sellers: Array.from(sellerMap.values()),
  })
}
