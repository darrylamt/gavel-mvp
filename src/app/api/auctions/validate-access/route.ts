import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compareAccessCodes } from '@/lib/privateAuctionUtils'
import { getAccessCode } from '@/lib/auctionAccessCodes'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

export async function POST(request: Request) {
  // Codes are guessable only by trial; cap attempts per IP.
  const rl = rateLimit('validate-access', getClientIp(request), 10, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => null)
    
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { auctionId, accessCode, viewerKey } = body

    if (!auctionId || !accessCode) {
      return NextResponse.json(
        { error: 'Auction ID and access code are required' },
        { status: 400 }
      )
    }

    // Service role: access codes are in a table only the server can read.
    const service = createClient(supabaseUrl, serviceRoleKey)
    
    const { data: auction, error: auctionError } = await service
      .from('auctions')
      .select('id, is_private, title')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Check if auction is private
    if (!auction.is_private) {
      return NextResponse.json(
        { error: 'This auction is not private' },
        { status: 400 }
      )
    }

    // Verify access code
    const storedCode = await getAccessCode(service, auction.id)
    if (!storedCode || !compareAccessCodes(accessCode, storedCode)) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 401 }
      )
    }

    // Get current user (may be null for anonymous access)
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const anon = createClient(supabaseUrl, supabaseAnonKey)
    
    let userId: string | null = null
    if (token) {
      const { data: { user }, error: userError } = await anon.auth.getUser(token)
      if (!userError && user) {
        userId = user.id
      }
    }

    // Use provided viewer key or user ID
    const finalViewerKey = viewerKey || userId || `viewer_${Date.now()}`

    // Record access in private_auction_access table
    const { error: accessError } = await service
      .from('private_auction_access')
      .upsert(
        {
          auction_id: auctionId,
          user_id: userId,
          viewer_key: finalViewerKey,
          accessed_at: new Date().toISOString(),
        },
        {
          onConflict: 'auction_id,viewer_key',
        }
      )

    if (accessError) {
      console.error('Error recording access:', accessError)
      // Continue anyway - this is just tracking
    }

    return NextResponse.json({
      success: true,
      message: 'Access granted',
      viewerKey: finalViewerKey,
    })
  } catch (error) {
    console.error('Error validating access code:', error)
    return NextResponse.json(
      { error: 'An error occurred while validating the access code' },
      { status: 500 }
    )
  }
}
