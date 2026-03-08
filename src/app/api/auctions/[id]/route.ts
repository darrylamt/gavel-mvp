import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeAuctionImageUrls } from '@/lib/auctionImages'

function normalizeAuctionId(raw: string) {
  const decoded = decodeURIComponent(raw).trim()
  if (!decoded) return ''
  return decoded.split(',')[0].split('/')[0].trim()
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  const resolved = await params
  const auctionId = normalizeAuctionId(resolved.id)

  if (!auctionId) {
    return NextResponse.json({ error: 'Invalid auction id' }, { status: 400 })
  }

  const client = createClient(supabaseUrl, serviceRoleKey || anonKey)
  const selectFields =
    'id, title, description, current_price, min_increment, max_increment, reserve_price, sale_source, seller_name, seller_phone, seller_id, ends_at, status, paid, winning_bid_id, image_url, images, starts_at, is_private, anonymous_bidding_enabled'

  const { data, error } = await client
    .from('auctions')
    .select(selectFields)
    .eq('id', auctionId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  const sellerId = String((data as { seller_id?: string | null }).seller_id || '').trim()
  const { data: activeSellerShop } = sellerId
    ? await client
        .from('shops')
        .select('name, created_at, updated_at')
        .eq('owner_id', sellerId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  const { data: latestSellerShop } = sellerId && !activeSellerShop
    ? await client
        .from('shops')
        .select('name, created_at, updated_at')
        .eq('owner_id', sellerId)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  const { data: deliveryZones, error: deliveryZonesError } = sellerId
    ? await client
        .from('seller_delivery_zones')
        .select('location_value, delivery_price, delivery_time_days')
        .eq('seller_id', sellerId)
        .eq('is_enabled', true)
        .order('delivery_price', { ascending: true })
    : { data: [], error: null }

  if (deliveryZonesError) {
    return NextResponse.json({ error: deliveryZonesError.message }, { status: 500 })
  }

  let normalizedImages = normalizeAuctionImageUrls(
    (data as { images?: unknown }).images,
    (data as { image_url?: string | null }).image_url ?? null
  )

  // Recover missing DB image links from storage objects if uploads exist for this auction.
  if (normalizedImages.length === 0) {
    const { data: files } = await client.storage
      .from('auction-images')
      .list(`auctions/${auctionId}`, { limit: 100, sortBy: { column: 'name', order: 'asc' } })

    const recovered = (files ?? [])
      .map((file) => {
        const name = String((file as { name?: string | null }).name || '').trim()
        if (!name || name.endsWith('/')) return null
        return `${supabaseUrl}/storage/v1/object/public/auction-images/auctions/${auctionId}/${name}`
      })
      .filter((value): value is string => Boolean(value))

    if (recovered.length > 0) {
      normalizedImages = Array.from(new Set(recovered))
      await client
        .from('auctions')
        .update({ image_url: normalizedImages[0], images: normalizedImages })
        .eq('id', auctionId)
    }
  }

  return NextResponse.json({
    auction: {
      ...data,
      seller_shop_name: (activeSellerShop as { name?: string | null } | null)?.name
        ?? (latestSellerShop as { name?: string | null } | null)?.name
        ?? null,
      images: normalizedImages,
      image_url: normalizedImages[0] ?? null,
      auction_payment_due_at:
        (data as { auction_payment_due_at?: string | null }).auction_payment_due_at ?? null,
      delivery_zones: deliveryZones ?? [],
    },
  })
}
