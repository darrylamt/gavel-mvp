import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string | null }>()

  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: bidsData, error: bidsError } = await service
    .from('bids')
    .select(`
      id,
      auction_id,
      user_id,
      amount,
      created_at,
      auctions(title),
      profiles(username)
    `)
    .order('created_at', { ascending: false })

  if (bidsError) {
    return NextResponse.json({ error: 'Failed to load bids' }, { status: 500 })
  }

  const bidderEmails = new Map<string, string>()
  const userIds = Array.from(new Set((bidsData ?? []).map((b: any) => b.user_id).filter(Boolean)))

  await Promise.all(
    userIds.map(async (userId: string) => {
      const { data: authUser } = await service.auth.admin.getUserById(userId)
      if (authUser.user?.email) {
        bidderEmails.set(userId, authUser.user.email)
      }
    })
  )

  const bids = (bidsData ?? []).map((b: any) => ({
    id: b.id,
    auction_id: b.auction_id,
    user_id: b.user_id,
    amount: b.amount,
    created_at: b.created_at,
    auction_title: Array.isArray(b.auctions)
      ? (b.auctions[0]?.title ?? undefined)
      : (b.auctions?.title ?? undefined),
    bidder_username: Array.isArray(b.profiles)
      ? (b.profiles[0]?.username ?? undefined)
      : (b.profiles?.username ?? undefined),
    bidder_email: bidderEmails.get(b.user_id) || '',
  }))

  return NextResponse.json({ bids })
}
