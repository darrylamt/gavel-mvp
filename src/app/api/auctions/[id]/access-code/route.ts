import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { setAccessCode } from '@/lib/auctionAccessCodes'

/**
 * PUT /api/auctions/[id]/access-code
 * Body: { access_code: string | null }
 *
 * Saves a private auction's access code. Used right after an auction is created
 * from the browser: codes live in auction_access_codes, which only the server
 * can read or write, so the creation pages can no longer put the code on the
 * auction row. Only the auction's seller or an admin may set it.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createClient(supabaseUrl, serviceRoleKey)
  const { data: authData, error: authError } = await service.auth.getUser(token)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = authData.user.id

  const body = await req.json().catch(() => null)
  const code = typeof body?.access_code === 'string' ? body.access_code : null

  const { data: auction } = await service
    .from('auctions')
    .select('id, seller_id, is_private')
    .eq('id', id)
    .maybeSingle()

  if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })

  if (auction.seller_id !== userId) {
    const { data: profile } = await service.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'You can only set the access code on your own auction' }, { status: 403 })
    }
  }

  if (code && code.trim() && !auction.is_private) {
    return NextResponse.json({ error: 'Only private auctions have an access code' }, { status: 400 })
  }

  try {
    await setAccessCode(service, id, code)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save access code' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
