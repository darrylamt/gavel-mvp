import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuctionEngagementCounts } from '@/lib/serverAuctionEngagement'
import { createHash } from 'node:crypto'
import { getAuthUser } from '@/lib/apiAuth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase env')
  return createClient(supabaseUrl, serviceRoleKey)
}

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
    let body: Record<string, unknown> | null = null
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    } else {
      const raw = await request.text().catch(() => '')
      if (raw) {
        body = JSON.parse(raw) as Record<string, unknown>
      }
    }

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const auctionId = typeof body.auction_id === 'string' ? body.auction_id.trim() : ''
    let viewerKey = typeof body.viewer_key === 'string' ? body.viewer_key.trim() : ''
    const action = body.action === 'star' ? 'star' : body.action === 'view' ? 'view' : null
    const starred = typeof body.starred === 'boolean' ? body.starred : null

    const authResult = await getAuthUser(request)
    const userId = 'user' in authResult ? authResult.user.id : null

    if (!viewerKey) {
      if (userId) {
        viewerKey = `user:${userId}`
      } else {
        const forwardedFor = request.headers.get('x-forwarded-for') || ''
        const userAgent = request.headers.get('user-agent') || ''
        const fingerprint = `${forwardedFor}|${userAgent}`
        viewerKey = `anon:${createHash('sha256').update(fingerprint).digest('hex').slice(0, 32)}`
      }
    }

    if (!auctionId || !viewerKey || !action) {
      return NextResponse.json({ error: 'auction_id, viewer_key and action are required' }, { status: 400 })
    }

    const admin = createAdminClient()
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
