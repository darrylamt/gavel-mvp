import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const anon = createClient(supabaseUrl, supabaseAnonKey)
const service = createClient(supabaseUrl, serviceRoleKey)

async function requireAdmin(request: Request) {
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data, error } = await service
    .from('shop_products')
    .select('id, title, description, price, stock, status, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const status = typeof body.status === 'string' ? body.status : 'active'
    const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : ''
    const price = Number(body.price)
    const stock = Number(body.stock)

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Price must be 0 or greater' }, { status: 400 })
    }

    if (!Number.isFinite(stock) || stock < 0) {
      return NextResponse.json({ error: 'Stock must be 0 or greater' }, { status: 400 })
    }

    if (!['draft', 'active', 'sold_out', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data, error } = await service
      .from('shop_products')
      .insert({
        title,
        description: description || null,
        price,
        stock,
        status,
        image_url: imageUrl || null,
        created_by: auth.user.id,
      })
      .select('id, title, description, price, stock, status, image_url, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create product'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
