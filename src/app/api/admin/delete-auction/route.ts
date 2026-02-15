import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function requireAdmin(request: Request) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.replace('Bearer ', '').trim()

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: roleError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (roleError || profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { userId: user.id }
}

export async function POST(req: Request) {
  try {
    const adminCheck = await requireAdmin(req)
    if ('error' in adminCheck) return adminCheck.error

    const body = await req.json()
    const { auctionId } = body

    if (!auctionId) {
      return NextResponse.json({ error: 'auctionId required' }, { status: 400 })
    }

    const { error } = await adminClient.from('auctions').delete().eq('id', auctionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
