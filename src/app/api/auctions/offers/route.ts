import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { queueArkeselNotification } from '@/lib/arkesel/queue'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/** POST /api/auctions/offers — buyer submits an offer */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { auction_id, amount, message } = await req.json() as {
    auction_id?: string; amount?: number; message?: string
  }
  if (!auction_id || !amount || amount <= 0) {
    return NextResponse.json({ error: 'auction_id and a positive amount are required' }, { status: 400 })
  }

  // Load auction to get seller_id and title
  const { data: auction } = await supabase
    .from('auctions')
    .select('id, title, seller_id, status, starts_at, ends_at')
    .eq('id', auction_id)
    .maybeSingle()

  if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  if (auction.seller_id === user.id) {
    return NextResponse.json({ error: 'You cannot make an offer on your own auction' }, { status: 403 })
  }

  // Check for existing pending offer from this buyer on this auction
  const { data: existing } = await supabase
    .from('auction_offers')
    .select('id, status')
    .eq('auction_id', auction_id)
    .eq('buyer_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You already have a pending offer on this auction' }, { status: 409 })
  }

  // Insert offer
  const { data: offer, error: insertErr } = await supabase
    .from('auction_offers')
    .insert({
      auction_id,
      buyer_id: user.id,
      seller_id: auction.seller_id,
      amount,
      message: message?.trim() || null,
    })
    .select('id')
    .single()

  if (insertErr || !offer) {
    console.error('[offers] insert failed:', insertErr)
    return NextResponse.json({ error: 'Failed to submit offer' }, { status: 500 })
  }

  // Get buyer username for the notification
  const { data: buyerProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const buyerName = buyerProfile?.username ?? 'A buyer'

  // Notify seller via SMS
  await queueArkeselNotification({
    userId: auction.seller_id,
    message: `${buyerName} made an offer of GHS ${amount.toLocaleString()} on your auction "${auction.title}". Log in to Gavel to accept or decline.`,
    category: 'transactional',
    dedupeKey: `offer:new:${offer.id}`,
  }).catch(() => {})

  return NextResponse.json({ success: true, offerId: offer.id })
}
