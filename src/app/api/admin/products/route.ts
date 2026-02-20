import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isShopCategory } from '@/lib/shopCategories'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const anon = createClient(supabaseUrl, supabaseAnonKey)
const service = createClient(supabaseUrl, serviceRoleKey)

type AccessContext = {
  user: { id: string }
  role: 'admin' | 'seller'
}

async function requireProductManager(request: Request): Promise<{ error: NextResponse } | AccessContext> {
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

  if (profile?.role !== 'admin' && profile?.role !== 'seller') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return {
    user: { id: user.id },
    role: profile.role,
  }
}

export async function GET(request: Request) {
  const auth = await requireProductManager(request)
  if ('error' in auth) return auth.error

  const query = service
    .from('shop_products')
    .select('id, title, description, price, stock, status, category, image_url, created_at, created_by')
    .order('created_at', { ascending: false })
    .limit(300)

  if (auth.role === 'seller') {
    query.eq('created_by', auth.user.id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireProductManager(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const status = typeof body.status === 'string' ? body.status : 'active'
    const category = typeof body.category === 'string' ? body.category.trim() : 'Other'
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

    if (!isShopCategory(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const { data, error } = await service
      .from('shop_products')
      .insert({
        title,
        description: description || null,
        price,
        stock,
        status,
        category,
        image_url: imageUrl || null,
        created_by: auth.user.id,
      })
      .select('id, title, description, price, stock, status, category, image_url, created_at')
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

export async function PATCH(request: Request) {
  const auth = await requireProductManager(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const status = typeof body.status === 'string' ? body.status : 'active'
    const category = typeof body.category === 'string' ? body.category.trim() : 'Other'
    const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : ''
    const price = Number(body.price)
    const stock = Number(body.stock)

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

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

    if (!isShopCategory(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const updateQuery = service
      .from('shop_products')
      .update({
        title,
        description: description || null,
        price,
        stock,
        status,
        category,
        image_url: imageUrl || null,
      })
      .eq('id', id)

    if (auth.role === 'seller') {
      updateQuery.eq('created_by', auth.user.id)
    }

    const { data, error } = await updateQuery
      .select('id, title, description, price, stock, status, category, image_url, created_at, created_by')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update product'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireProductManager(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id.trim() : ''

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const deleteQuery = service.from('shop_products').delete().eq('id', id)

    if (auth.role === 'seller') {
      deleteQuery.eq('created_by', auth.user.id)
    }

    const { error } = await deleteQuery

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete product'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
