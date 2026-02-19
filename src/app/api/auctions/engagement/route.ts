import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuctionEngagementCounts } from '@/lib/serverAuctionEngagement'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const url = new URL(request.url)
  const rawIds = url.searchParams.get('auctionIds') || url.searchParams.get('auctionId') || ''

  const auctionIds = rawIds
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (auctionIds.length === 0) {
    return NextResponse.json({ counts: {} })
  }

  const counts = await getAuctionEngagementCounts(auctionIds)
  const response: Record<string, { bidderCount: number; watcherCount: number }> = {}

  for (const [auctionId, value] of counts.entries()) {
    response[auctionId] = value
  }

  return NextResponse.json({ counts: response })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const auctionId = typeof body.auction_id === 'string' ? body.auction_id.trim() : ''
    const viewerKey = typeof body.viewer_key === 'string' ? body.viewer_key.trim() : ''
    const action = body.action === 'star' ? 'star' : body.action === 'view' ? 'view' : null
    const starred = typeof body.starred === 'boolean' ? body.starred : null
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : null

    if (!auctionId || !viewerKey || !action) {
      return NextResponse.json({ error: 'auction_id, viewer_key and action are required' }, { status: 400 })
    }

    const { data: existingByViewer } = await admin
      .from('auction_watchers')
      .select('starred, viewed')
      .eq('auction_id', auctionId)
      .eq('viewer_key', viewerKey)
      .maybeSingle()

    let existingByUser:
      | { viewer_key: string; starred: boolean; viewed: boolean }
      | null
      = null

    if (userId) {
      const { data } = await admin
        .from('auction_watchers')
        .select('viewer_key, starred, viewed')
        .eq('auction_id', auctionId)
        .eq('user_id', userId)
        .maybeSingle()

      existingByUser = data
    }

    const current = existingByUser ?? existingByViewer

    const payload = {
      auction_id: auctionId,
      viewer_key: existingByUser?.viewer_key ?? viewerKey,
      user_id: userId,
      starred: action === 'star' ? (starred ?? false) : (current?.starred ?? false),
      viewed: action === 'view' ? true : (current?.viewed ?? false),
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await admin
      .from('auction_watchers')
      .upsert(payload, { onConflict: 'auction_id,viewer_key' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to track engagement'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
