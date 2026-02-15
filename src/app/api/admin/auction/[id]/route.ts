import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

async function getAdminClient(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return { error: NextResponse.json({ error: 'Server configuration missing' }, { status: 500 }) }
  }

  const authHeader = req.headers.get('authorization') || ''
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

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { service }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await getAdminClient(req)
  if ('error' in admin) return admin.error

  const { data, error } = await admin.service
    .from('auctions')
    .select('id, title, description, starting_price, current_price, reserve_price, min_increment, max_increment, starts_at, ends_at, status, sale_source, seller_name, seller_phone, seller_expected_amount')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  return NextResponse.json({ auction: data })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await getAdminClient(req)
  if ('error' in admin) return admin.error

  const body = await req.json()

  const {
    title,
    description,
    starting_price,
    reserve_price,
    min_increment,
    max_increment,
    starts_at,
    ends_at,
    sale_source,
    seller_name,
    seller_phone,
    seller_expected_amount,
  } = body

  const { data: existing } = await admin.service
    .from('auctions')
    .select('starts_at')
    .eq('id', id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  const hasStarted = existing.starts_at ? new Date(existing.starts_at).getTime() <= Date.now() : true
  if (hasStarted) {
    return NextResponse.json({ error: 'Only auctions that have not started can be edited.' }, { status: 400 })
  }

  const { error } = await admin.service
    .from('auctions')
    .update({
      title,
      description,
      starting_price,
      current_price: starting_price,
      reserve_price,
      min_increment,
      max_increment,
      starts_at,
      ends_at,
      sale_source,
      seller_name,
      seller_phone,
      seller_expected_amount,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
