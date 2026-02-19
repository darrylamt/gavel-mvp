import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    'id, title, description, current_price, min_increment, max_increment, reserve_price, sale_source, seller_name, seller_phone, ends_at, status, paid, winning_bid_id, image_url, images, starts_at'

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

  return NextResponse.json({
    auction: {
      ...data,
      auction_payment_due_at:
        (data as { auction_payment_due_at?: string | null }).auction_payment_due_at ?? null,
    },
  })
}
