import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { maskBidderEmail } from '@/lib/maskBidderEmail'
import { queueBidNotifications } from '@/lib/whatsapp/events'
import { queueWhatsAppNotification } from '@/lib/whatsapp/queue'
import { sendNotificationEmail } from '@/lib/resend-service'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function createServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase env')
  return createClient(supabaseUrl, serviceRoleKey)
}

function createAnonClient() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase env')
  return createClient(supabaseUrl, supabaseAnonKey)
}

const BID_TOKEN_COST = 1

type BidRow = {
  id: string
  amount: number
  user_id: string
  profiles?: { username: string | null } | { username: string | null }[] | null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const auctionId = searchParams.get('auction_id')

  if (!auctionId) {
    return NextResponse.json({ error: 'Missing auction_id' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bids')
    .select('id, amount, user_id, profiles (username)')
    .eq('auction_id', auctionId)
    .order('amount', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load bids' }, { status: 500 })
  }

  const rows = (data ?? []) as BidRow[]
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)))

  const maskedEmailByUserId = new Map<string, string>()

  await Promise.all(
    userIds.map(async (userId) => {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      const masked = maskBidderEmail(authUser.user?.email)
      if (masked) {
        maskedEmailByUserId.set(userId, masked)
      }
    })
  )

  const bids = rows.map((row) => {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0] ?? undefined
      : row.profiles ?? undefined

    return {
      id: row.id,
      amount: row.amount,
      user_id: row.user_id,
      profiles: {
        username: profile?.username ?? null,
      },
      masked_email: maskedEmailByUserId.get(row.user_id) ?? null,
    }
  })

  return NextResponse.json({ bids })
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anon = createAnonClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await anon.auth.getUser(token)
  if (authError || !authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user_id = authUser.id

  let body: { auction_id?: string; amount?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { auction_id, amount } = body

  if (!auction_id || amount === undefined || amount === null) {
    return NextResponse.json(
      { error: 'Missing required fields: auction_id, amount' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  /* ---------------- AUCTION CHECK ---------------- */

  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .select('id, title, seller_id, status, starts_at, ends_at, current_price, reserve_price, min_increment, max_increment')
    .eq('id', auction_id)
    .single()

  if (auctionError || !auction) {
    return NextResponse.json(
      { error: 'Auction not found' },
      { status: 404 }
    )
  }

  const now = Date.now()

  /* Check if auction has started */
  const hasStarted =
    !auction.starts_at ||
    new Date(auction.starts_at).getTime() <= now

  if (!hasStarted) {
    return NextResponse.json(
      { error: 'Auction has not started yet' },
      { status: 403 }
    )
  }

  /* Check if auction has ended */
  const endedByTime =
    auction.ends_at &&
    new Date(auction.ends_at).getTime() <= now

  if (endedByTime || auction.status === 'ended') {
    if (auction.status !== 'ended') {
      await supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', auction_id)
    }

    return NextResponse.json(
      { error: 'Auction has ended' },
      { status: 403 }
    )
  }

  if (auction.status === 'scheduled') {
    await supabase
      .from('auctions')
      .update({ status: 'active' })
      .eq('id', auction_id)
  }

  const bidAmount = Number(amount)
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return NextResponse.json(
      { error: 'Invalid bid amount' },
      { status: 400 }
    )
  }

  /* Check bid amount against current price */
  if (bidAmount <= auction.current_price) {
    return NextResponse.json(
      { error: 'Bid must be higher than current price' },
      { status: 400 }
    )
  }

  const bidIncrement = bidAmount - auction.current_price
  const minIncrement = Number(auction.min_increment ?? 1)
  const maxIncrement = auction.max_increment == null ? null : Number(auction.max_increment)

  if (Number.isFinite(minIncrement) && minIncrement > 0 && bidIncrement < minIncrement) {
    return NextResponse.json(
      { error: `Bid must be at least GHS ${minIncrement.toLocaleString()} above current price` },
      { status: 400 }
    )
  }

  if (maxIncrement != null && Number.isFinite(maxIncrement) && maxIncrement > 0 && bidIncrement > maxIncrement) {
    return NextResponse.json(
      { error: `Bid cannot be more than GHS ${maxIncrement.toLocaleString()} above current price` },
      { status: 400 }
    )
  }

  /* ---------------- TOKEN CHECK ---------------- */

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('token_balance')
    .eq('id', user_id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 }
    )
  }

  if (profile.token_balance < BID_TOKEN_COST) {
    return NextResponse.json(
      { error: 'Insufficient tokens to place a bid' },
      { status: 402 }
    )
  }

  const { data: latestBid } = await supabase
    .from('bids')
    .select('user_id')
    .eq('auction_id', auction_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: previousTopBid } = await supabase
    .from('bids')
    .select('user_id, amount')
    .eq('auction_id', auction_id)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ user_id: string; amount: number }>()

  if (latestBid?.user_id === user_id) {
    return NextResponse.json(
      { error: 'You cannot bid twice in a row. Wait for another bidder.' },
      { status: 400 }
    )
  }

  /* ---------------- INSERT BID ---------------- */

  const { error: bidError } = await supabase
    .from('bids')
    .insert({
      auction_id,
      user_id,
      amount: bidAmount,
    })

  if (bidError) {
    console.error('Bid insert error:', bidError)
    return NextResponse.json(
      { error: `Failed to place bid: ${bidError.message}` },
      { status: 500 }
    )
  }

  /* ---------------- UPDATE AUCTION ---------------- */

  const endsAtMs = auction.ends_at ? new Date(auction.ends_at).getTime() : null
  const remainingMs = endsAtMs != null ? endsAtMs - now : null
  const shouldExtendBy30s = remainingMs != null && remainingMs > 0 && remainingMs <= 60_000

  const nextAuctionUpdate: { current_price: number; ends_at?: string } = {
    current_price: bidAmount,
  }

  if (shouldExtendBy30s && endsAtMs != null) {
    nextAuctionUpdate.ends_at = new Date(endsAtMs + 30_000).toISOString()
  }

  await supabase
    .from('auctions')
    .update(nextAuctionUpdate)
    .eq('id', auction_id)

  /* ---------------- DEDUCT TOKEN ---------------- */

  await supabase
    .from('profiles')
    .update({
      token_balance: profile.token_balance - BID_TOKEN_COST,
    })
    .eq('id', user_id)

  /* ---------------- LOG TRANSACTION ---------------- */

  await supabase.from('token_transactions').insert({
    user_id,
    amount: -BID_TOKEN_COST,
    type: 'bid',
    reference: `bid:${auction_id}`,
  })

  /* ---------------- EMAIL NOTIFICATIONS ---------------- */

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'
  const auctionUrl = `${siteUrl}/auctions/${auction_id}`

  await Promise.allSettled([
    queueBidNotifications({
      auctionId: String(auction.id),
      auctionTitle: String(auction.title || 'Auction'),
      bidderUserId: String(user_id),
      bidderAmount: bidAmount,
      previousTopBidderUserId: previousTopBid?.user_id ?? null,
      sellerUserId: (auction as { seller_id?: string | null }).seller_id ?? null,
    }),
    (async () => {
      // Send outbid email to previous top bidder
      if (previousTopBid?.user_id) {
        const { data: previousBidder } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', previousTopBid.user_id)
          .single()

        if (previousBidder?.email) {
          await sendNotificationEmail(previousBidder.email, 'outbid', {
            userName: previousBidder.full_name || 'there',
            auctionTitle: String(auction.title || 'Auction'),
            currentBid: bidAmount,
            auctionUrl,
          })
        }
      }

      // Send new bid email to seller
      if (auction.seller_id) {
        const { data: seller } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', auction.seller_id)
          .single()

        // Count total bids for this auction
        const { count: bidsCount } = await supabase
          .from('bids')
          .select('*', { count: 'exact', head: true })
          .eq('auction_id', auction_id)

        if (seller?.email) {
          await sendNotificationEmail(seller.email, 'newBid', {
            sellerName: seller.full_name || 'there',
            auctionTitle: String(auction.title || 'Auction'),
            bidAmount: bidAmount,
            auctionUrl,
            bidsCount: bidsCount || 1,
          })
        }
      }
    })(),
    (async () => {
      const { data: watchers } = await supabase
        .from('auction_watchers')
        .select('user_id')
        .eq('auction_id', auction_id)

      const watcherUserIds = Array.from(
        new Set((watchers ?? []).map((row) => String(row.user_id || '')).filter(Boolean))
      ).filter((watcherId) => watcherId !== String(user_id))

      await Promise.allSettled(
        watcherUserIds.map((watcherId) =>
          queueWhatsAppNotification({
            userId: watcherId,
            templateKey: 'watchlist_new_bid',
            params: {
              auction_title: String(auction.title || 'Auction'),
              amount: bidAmount,
            },
            dedupeKey: `watchlist-new-bid:${auction_id}:${watcherId}:${bidAmount}`,
          })
        )
      )
    })(),
  ])

  return NextResponse.json({ success: true })
}
