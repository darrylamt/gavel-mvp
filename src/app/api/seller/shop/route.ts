import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const anon = createClient(supabaseUrl, anonKey)
const service = createClient(supabaseUrl, serviceKey)

type ShopRow = {
  id: string
  owner_id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  payout_account_name: string | null
  payout_account_number: string | null
  payout_provider: string | null
  status: string
}

function toSlug(input: string): string {
  const clean = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return clean || 'shop'
}

async function requireSeller(request: Request): Promise<{ error: NextResponse } | { userId: string }> {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('role, username')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'seller') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { userId: user.id }
}

async function ensureShop(userId: string): Promise<ShopRow> {
  const { data: existing } = await service
    .from('shops')
    .select('id, owner_id, slug, name, description, logo_url, cover_image_url, payout_account_name, payout_account_number, payout_provider, status')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return existing as ShopRow
  }

  const { data: profile } = await service
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle()

  const baseName = (profile?.username || 'Seller Shop').trim() || 'Seller Shop'
  const baseSlug = `${toSlug(baseName)}-${userId.slice(0, 6)}`

  for (let i = 0; i < 5; i += 1) {
    const slug = i === 0 ? baseSlug : `${baseSlug}-${i}`

    const { data: created, error } = await service
      .from('shops')
      .insert({
        owner_id: userId,
        name: baseName,
        slug,
        status: 'active',
      })
      .select('id, owner_id, slug, name, description, logo_url, cover_image_url, payout_account_name, payout_account_number, payout_provider, status')
      .single()

    if (!error && created) return created as ShopRow

    if (!String(error?.message || '').toLowerCase().includes('duplicate')) break
  }

  const { data: fallback } = await service
    .from('shops')
    .select('id, owner_id, slug, name, description, logo_url, cover_image_url, payout_account_name, payout_account_number, payout_provider, status')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!fallback) {
    throw new Error('Failed to initialize seller shop')
  }

  return fallback as ShopRow
}

export async function GET(request: Request) {
  const auth = await requireSeller(request)
  if ('error' in auth) return auth.error

  try {
    const shop = await ensureShop(auth.userId)
    return NextResponse.json({ shop })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load shop'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSeller(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const logoUrl = typeof body.logo_url === 'string' ? body.logo_url.trim() : ''
    const coverImageUrl = typeof body.cover_image_url === 'string' ? body.cover_image_url.trim() : ''
    const payoutAccountName = typeof body.payout_account_name === 'string' ? body.payout_account_name.trim() : ''
    const payoutAccountNumber = typeof body.payout_account_number === 'string' ? body.payout_account_number.trim() : ''
    const payoutProvider = typeof body.payout_provider === 'string' ? body.payout_provider.trim() : ''

    if (!name) {
      return NextResponse.json({ error: 'Shop name is required' }, { status: 400 })
    }

    const shop = await ensureShop(auth.userId)

    const { data: updated, error } = await service
      .from('shops')
      .update({
        name,
        description: description || null,
        logo_url: logoUrl || null,
        cover_image_url: coverImageUrl || null,
        payout_account_name: payoutAccountName || null,
        payout_account_number: payoutAccountNumber || null,
        payout_provider: payoutProvider || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shop.id)
      .eq('owner_id', auth.userId)
      .select('id, owner_id, slug, name, description, logo_url, cover_image_url, payout_account_name, payout_account_number, payout_provider, status')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shop: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update shop'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
