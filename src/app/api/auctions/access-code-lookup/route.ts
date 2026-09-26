import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compareAccessCodes } from '@/lib/privateAuctionUtils'
import { getAccessCodes } from '@/lib/auctionAccessCodes'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

export async function POST(request: Request) {
  // Each guess is tested against every private auction, so cap attempts per IP.
  const rl = rateLimit('access-code-lookup', getClientIp(request), 10, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => null)

    if (!body?.code) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    // Service role: access codes are in a table only the server can read.
    const service = createClient(supabaseUrl, serviceRoleKey)

    const { data: auctions, error: queryError } = await service
      .from('auctions')
      .select('id, title, is_private')
      .eq('is_private', true)

    if (queryError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!auctions || auctions.length === 0) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
    }

    // Find matching auction by comparing codes
    const codes = await getAccessCodes(service, auctions.map((a) => a.id as string))
    let foundAuction = null
    for (const auction of auctions) {
      const storedCode = codes.get(auction.id as string)
      if (storedCode && compareAccessCodes(body.code, storedCode)) {
        foundAuction = auction
        break
      }
    }

    if (!foundAuction) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
    }

    // Get auth user for tracking (optional)
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const anon = createClient(supabaseUrl, anonKey)

    let userId: string | null = null
    if (token) {
      const { data: { user }, error: userError } = await anon.auth.getUser(token)
      if (!userError && user) {
        userId = user.id
      }
    }

    // Record access
    const viewerKey = userId || `viewer_${Date.now()}`
    try {
      await service
        .from('private_auction_access')
        .upsert(
          {
            auction_id: foundAuction.id,
            user_id: userId,
            viewer_key: viewerKey,
            accessed_at: new Date().toISOString(),
          },
          {
            onConflict: 'auction_id,viewer_key',
          }
        )
      // Successfully recorded
     } catch {
      // Silently fail - this is just tracking
    }

    // Return auction info with slug
    const slug = foundAuction.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    return NextResponse.json({
      auction_id: foundAuction.id,
      slug,
    })
  } catch (error) {
    console.error('Error looking up access code:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing the access code' },
      { status: 500 }
    )
  }
}
