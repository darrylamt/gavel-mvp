import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

async function getSellerClient(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return { error: NextResponse.json({ error: 'Server configuration missing' }, { status: 500 }) }
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return { error: unauthorized() }
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return { error: unauthorized() }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'seller' && profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return {
    service,
    userId: user.id,
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const seller = await getSellerClient(request)
  if ('error' in seller) return seller.error

  const { data, error } = await seller.service
    .from('auctions')
    .select('id, title, description, starting_price, current_price, reserve_price, min_increment, max_increment, starts_at, ends_at, status, seller_expected_amount')
    .eq('id', id)
    .eq('seller_id', seller.userId)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  return NextResponse.json({ auction: data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const seller = await getSellerClient(request)
  if ('error' in seller) return seller.error

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const startingPrice = Number(body.starting_price)
  const reservePrice = body.reserve_price == null || body.reserve_price === '' ? null : Number(body.reserve_price)
  const minIncrement = body.min_increment == null || body.min_increment === '' ? 1 : Number(body.min_increment)
  const maxIncrement = body.max_increment == null || body.max_increment === '' ? null : Number(body.max_increment)
  const startsAt = typeof body.starts_at === 'string' ? body.starts_at : ''
  const endsAt = typeof body.ends_at === 'string' ? body.ends_at : ''

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  if (!description) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  if (!Number.isFinite(startingPrice) || startingPrice < 0) {
    return NextResponse.json({ error: 'Starting price must be 0 or greater' }, { status: 400 })
  }

  if (reservePrice != null && (!Number.isFinite(reservePrice) || reservePrice < 0)) {
    return NextResponse.json({ error: 'Reserve price must be 0 or greater' }, { status: 400 })
  }

  if (!Number.isFinite(minIncrement) || minIncrement < 0) {
    return NextResponse.json({ error: 'Minimum increment must be 0 or greater' }, { status: 400 })
  }

  if (maxIncrement != null && (!Number.isFinite(maxIncrement) || maxIncrement < 0)) {
    return NextResponse.json({ error: 'Maximum increment must be 0 or greater' }, { status: 400 })
  }

  if (!startsAt || !endsAt) {
    return NextResponse.json({ error: 'Start and end time are required' }, { status: 400 })
  }

  const startsAtIso = new Date(startsAt).toISOString()
  const endsAtIso = new Date(endsAt).toISOString()

  if (Number.isNaN(new Date(startsAtIso).getTime()) || Number.isNaN(new Date(endsAtIso).getTime())) {
    return NextResponse.json({ error: 'Invalid start or end time' }, { status: 400 })
  }

  if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
  }

  const { data: existing } = await seller.service
    .from('auctions')
    .select('id, starts_at')
    .eq('id', id)
    .eq('seller_id', seller.userId)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  const hasStarted = existing.starts_at ? new Date(existing.starts_at).getTime() <= Date.now() : true
  if (hasStarted) {
    return NextResponse.json({ error: 'Only auctions that have not started can be edited.' }, { status: 400 })
  }

  const { error } = await seller.service
    .from('auctions')
    .update({
      title,
      description,
      starting_price: startingPrice,
      current_price: startingPrice,
      reserve_price: reservePrice,
      min_increment: minIncrement,
      max_increment: maxIncrement,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      status: new Date(startsAtIso).getTime() > Date.now() ? 'scheduled' : 'active',
    })
    .eq('id', id)
    .eq('seller_id', seller.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const seller = await getSellerClient(request)
  if ('error' in seller) return seller.error

  const { data: existing } = await seller.service
    .from('auctions')
    .select('id, starts_at')
    .eq('id', id)
    .eq('seller_id', seller.userId)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  const hasStarted = existing.starts_at ? new Date(existing.starts_at).getTime() <= Date.now() : true
  if (hasStarted) {
    return NextResponse.json({ error: 'Only auctions that have not started can be deleted.' }, { status: 400 })
  }

  const { error } = await seller.service
    .from('auctions')
    .delete()
    .eq('id', id)
    .eq('seller_id', seller.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
