import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compareAccessCodes } from '@/lib/privateAuctionUtils'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
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

    // Use service role to verify auction exists and get access code
    const service = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey)
    
    const { data: auction, error: auctionError } = await service
      .from('auctions')
      .select('id, is_private, access_code, title')
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
    if (!auction.access_code || !compareAccessCodes(accessCode, auction.access_code)) {
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
