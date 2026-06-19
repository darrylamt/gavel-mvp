import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import * as Sentry from '@sentry/nextjs'
import { settleAuction } from '@/lib/auctionSettlement'

/**
 * POST /api/auctions/close
 *
 * Best-effort, on-page settlement fallback. The auction detail page calls this
 * when a visitor loads an auction that has ended but hasn't been settled yet.
 * The authoritative path is the cron at /api/auctions/settle-ended; this just
 * makes settlement feel instant for whoever opens the page first. Both delegate
 * to the same idempotent settleAuction() helper.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

function normalizeAuctionId(raw: unknown) {
  if (typeof raw !== 'string') return ''
  const decoded = decodeURIComponent(raw).trim()
  if (!decoded) return ''
  return decoded.split(',')[0].split('/')[0].trim()
}

export async function POST(req: Request) {
  const payload = await req.json()
  const auction_id = normalizeAuctionId(payload.auction_id)

  if (!auction_id) {
    return NextResponse.json({ error: 'Missing auction_id' }, { status: 400 })
  }

  try {
    const result = await settleAuction(supabase, auction_id)

    if (result.reason === 'auction_not_ended') {
      return NextResponse.json({ error: 'Auction not ended yet' }, { status: 400 })
    }

    if (result.reason === 'already_paid') {
      return NextResponse.json({ success: true, paid: true })
    }

    return NextResponse.json({
      success: true,
      reserveMet: result.reserveMet,
      winningBidId: result.winningBidId,
      paymentDueAt: result.paymentDueAt,
      refundsIssued: result.refundsIssued,
    })
  } catch (error) {
    console.error('[auctions/close] error:', error)
    Sentry.captureException(error, { tags: { route: 'auctions/close' }, extra: { auction_id } })
    const message = error instanceof Error ? error.message : 'Failed to close auction'
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Failed to close auction' },
      { status: 500 }
    )
  }
}
