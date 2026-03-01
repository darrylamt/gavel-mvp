import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { normalizeDiscountCode } from '@/lib/discounts'

type DiscountPayload = {
  id?: string
  code?: string
  percent_off?: number
  max_uses?: number | null
  ends_at?: string | null
  is_active?: boolean
}

function parseOptionalMaxUses(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.floor(parsed)
}

function parseOptionalEndsAt(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

async function resolveAdmin(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return { error: NextResponse.json({ error: 'Server configuration missing' }, { status: 500 }) }
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { userId: user.id, service }
}

export async function GET(request: Request) {
  const auth = await resolveAdmin(request)
  if ('error' in auth) return auth.error

  const { data, error } = await auth.service
    .from('discount_codes')
    .select('id, code, percent_off, max_uses, used_count, ends_at, is_active, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ discounts: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await resolveAdmin(request)
  if ('error' in auth) return auth.error

  const body = (await request.json()) as DiscountPayload
  const code = normalizeDiscountCode(body.code)
  const percentOff = Number(body.percent_off)
  const maxUses = parseOptionalMaxUses(body.max_uses)
  const endsAt = parseOptionalEndsAt(body.ends_at)

  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
    return NextResponse.json({ error: 'Percent off must be between 0 and 100' }, { status: 400 })
  }

  const { data, error } = await auth.service
    .from('discount_codes')
    .insert({
      code,
      percent_off: Number(percentOff.toFixed(2)),
      max_uses: maxUses,
      ends_at: endsAt,
      is_active: body.is_active !== false,
      created_by: auth.userId,
    })
    .select('id, code, percent_off, max_uses, used_count, ends_at, is_active, created_at, updated_at')
    .single()

  if (error) {
    const message = String(error.message || '')
    if (message.toLowerCase().includes('duplicate key')) {
      return NextResponse.json({ error: 'Discount code already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: message || 'Failed to create discount code' }, { status: 500 })
  }

  return NextResponse.json({ discount: data })
}

export async function PATCH(request: Request) {
  const auth = await resolveAdmin(request)
  if ('error' in auth) return auth.error

  const body = (await request.json()) as DiscountPayload
  const id = String(body.id || '').trim()

  if (!id) {
    return NextResponse.json({ error: 'Discount id is required' }, { status: 400 })
  }

  const updates: Record<string, string | number | boolean | null> = {}

  if (typeof body.code !== 'undefined') {
    const code = normalizeDiscountCode(body.code)
    if (!code) return NextResponse.json({ error: 'Code cannot be empty' }, { status: 400 })
    updates.code = code
  }

  if (typeof body.percent_off !== 'undefined') {
    const percentOff = Number(body.percent_off)
    if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
      return NextResponse.json({ error: 'Percent off must be between 0 and 100' }, { status: 400 })
    }
    updates.percent_off = Number(percentOff.toFixed(2))
  }

  if (typeof body.max_uses !== 'undefined') {
    updates.max_uses = parseOptionalMaxUses(body.max_uses)
  }

  if (typeof body.ends_at !== 'undefined') {
    updates.ends_at = parseOptionalEndsAt(body.ends_at)
  }

  if (typeof body.is_active !== 'undefined') {
    updates.is_active = Boolean(body.is_active)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const { data, error } = await auth.service
    .from('discount_codes')
    .update(updates)
    .eq('id', id)
    .select('id, code, percent_off, max_uses, used_count, ends_at, is_active, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ discount: data })
}
