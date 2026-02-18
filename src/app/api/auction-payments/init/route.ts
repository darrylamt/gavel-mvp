import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { auction_id, user_id, email } = await req.json()

  if (!auction_id || !user_id || !email) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  let resolution: Awaited<ReturnType<typeof resolveAuctionPaymentCandidate>>

  try {
    resolution = await resolveAuctionPaymentCandidate(supabase, auction_id)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Auction not found')) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    console.error('Failed to resolve auction payment candidate:', error)
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }

  if (resolution.reason === 'auction_not_ended') {
    return NextResponse.json({ error: 'Auction not ended' }, { status: 400 })
  }

  if (resolution.reason === 'already_paid') {
    return NextResponse.json({ error: 'Auction already paid' }, { status: 400 })
  }

  if (!resolution.activeCandidate) {
    return NextResponse.json(
      { error: 'No eligible winner above reserve price. Auction closed without sale.' },
      { status: 400 }
    )
  }

  if (resolution.activeCandidate.userId !== user_id) {
    return NextResponse.json(
      { error: 'You are not the current payment winner' },
      { status: 403 }
    )
  }

  // 3️⃣ Init Paystack
  const res = await fetch(
    'https://api.paystack.co/transaction/initialize',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(resolution.activeCandidate.amount) * 100),
        metadata: {
          type: 'auction_payment',
          auction_id,
          bid_id: resolution.activeCandidate.bidId,
          user_id,
          winner_rank: resolution.activeCandidate.rank,
        },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?type=auction`,
      }),
    }
  )

  const json = await res.json()

  if (!json.status) {
    return NextResponse.json({ error: 'Paystack init failed' }, { status: 500 })
  }

  return NextResponse.json(json.data)
}
