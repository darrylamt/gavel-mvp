import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { queueArkeselNotification } from '@/lib/arkesel/queue'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const ONE_HOUR_MS = 60 * 60 * 1000

/** POST /api/auctions/offers/[offerId]/respond  body: { action: 'accept' | 'reject' } */
export async function POST(req: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { offerId } = await params
  const { action } = await req.json() as { action?: 'accept' | 'reject' }
  if (!action || !['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be accept or reject' }, { status: 400 })
  }

  // Load offer
  const { data: offer } = await supabase
    .from('auction_offers')
    .select('id, auction_id, buyer_id, seller_id, amount, status')
    .eq('id', offerId)
    .maybeSingle()

  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  if (offer.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (offer.status !== 'pending') {
    return NextResponse.json({ error: 'Offer already responded to' }, { status: 409 })
  }

  // Update offer status
  await supabase
    .from('auction_offers')
    .update({ status: action === 'accept' ? 'accepted' : 'rejected', responded_at: new Date().toISOString() })
    .eq('id', offerId)

  if (action === 'accept') {
    // Mark auction as ended with this offer as the winning bid
    const { data: auction } = await supabase
      .from('auctions')
      .select('id, title, current_price')
      .eq('id', offer.auction_id)
      .single()

    // Insert a bid at offer price
    const { data: bid } = await supabase
      .from('bids')
      .insert({ auction_id: offer.auction_id, user_id: offer.buyer_id, amount: offer.amount })
      .select('id')
      .single()

    if (bid) {
      const paymentDueAt = new Date(Date.now() + ONE_HOUR_MS).toISOString()
      await supabase
        .from('auctions')
        .update({
          status: 'ended',
          winning_bid_id: bid.id,
          current_price: offer.amount,
          auction_payment_due_at: paymentDueAt,
        })
        .eq('id', offer.auction_id)

      // Notify buyer
      await queueArkeselNotification({
        userId: offer.buyer_id,
        message: `Your offer of GHS ${offer.amount.toLocaleString()} on "${auction?.title}" was accepted! You have 1 hour to complete payment. Visit gavelgh.com/pay/${offer.auction_id}`,
        category: 'transactional',
        dedupeKey: `offer:accepted:${offerId}`,
      }).catch(() => {})
    }
  } else {
    // Notify buyer of rejection
    const { data: auction } = await supabase
      .from('auctions')
      .select('title')
      .eq('id', offer.auction_id)
      .single()

    await queueArkeselNotification({
      userId: offer.buyer_id,
      message: `Your offer on "${auction?.title}" was declined. You can still place a bid when the auction goes live.`,
      category: 'transactional',
      dedupeKey: `offer:rejected:${offerId}`,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, status: action === 'accept' ? 'accepted' : 'rejected' })
}
