import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'
import { getPaymentProvider } from '@/lib/payment'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeAuctionId(raw: unknown) {
  if (typeof raw !== 'string') return ''
  const decoded = decodeURIComponent(raw).trim()
  if (!decoded) return ''
  return decoded.split(',')[0].split('/')[0].trim()
}

export async function POST(req: Request) {
  const rl = rateLimit('auction-payments-init', getClientIp(req), 10, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs)

  // Identity comes from the verified access token, never the request body.
  // The email is forwarded to the payment provider as the payer address, so a
  // body-supplied one would let a caller put someone else's address on a payment.
  // Any user_id/email still sent in the body (older clients) is ignored.
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await req.json().catch(() => ({}))
  const auction_id = normalizeAuctionId(payload.auction_id)
  const user_id = authData.user.id
  const email = authData.user.email

  if (!auction_id || !email) {
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
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? message || 'Failed to initialize payment'
            : 'Failed to initialize payment',
      },
      { status: 500 }
    )
  }

  if (resolution.reason === 'auction_not_ended') {
    return NextResponse.json({ error: 'Auction not ended' }, { status: 400 })
  }

  if (resolution.reason === 'already_paid') {
    return NextResponse.json({ error: 'Auction already paid' }, { status: 400 })
  }

  if (!resolution.activeCandidate) {
    return NextResponse.json(
      { error: 'No eligible winner at or above reserve price. Auction closed without sale.' },
      { status: 400 }
    )
  }

  if (resolution.activeCandidate.userId !== user_id) {
    return NextResponse.json(
      { error: 'You are not the current payment winner' },
      { status: 403 }
    )
  }

  // 3️⃣ Init payment via active provider
  try {
    const provider = getPaymentProvider()
    const result = await provider.initializePayment({
      email,
      amountGHS: Number(resolution.activeCandidate.amount),
      metadata: {
        type: 'auction_payment',
        auction_id,
        bid_id: resolution.activeCandidate.bidId,
        user_id,
        winner_rank: resolution.activeCandidate.rank,
      },
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?type=auction`,
      description: 'Gavel auction payment',
    })
    return NextResponse.json({ authorization_url: result.authorizationUrl, reference: result.reference })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment init failed'
    console.error('Auction payment init failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
