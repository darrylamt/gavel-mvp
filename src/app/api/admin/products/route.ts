import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

type ShopRow = {
  id: string
  owner_id: string
  name: string
  slug: string
  status: string
}

type CategoryRow = {
  name: string
  slug: string
  image_url: string | null
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

function toSlug(input: string): string {
  const clean = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return clean || 'shop'
}

async function ensureSellerShop(userId: string): Promise<ShopRow> {
  const { data: existingShops } = await service
    .from('shops')
    .select('id, owner_id, name, slug, status')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  const existing = ((existingShops ?? [])[0] as ShopRow | undefined) ?? null
  if (existing) {
    return existing
  }

  const { data: profile } = await service
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle()

  const baseName = (profile?.username || 'Seller Shop').trim() || 'Seller Shop'
  const baseSlug = `${toSlug(baseName)}-${userId.slice(0, 6)}`

  for (let index = 0; index < 5; index += 1) {
    const slug = index === 0 ? baseSlug : `${baseSlug}-${index}`
    const { data: createdShop, error } = await service
      .from('shops')
      .insert({
        owner_id: userId,
        name: baseName,
        slug,
        status: 'active',
      })
      .select('id, owner_id, name, slug, status')
      .single()

    if (!error && createdShop) {
      return createdShop as ShopRow
    }

    if (!String(error?.message || '').toLowerCase().includes('duplicate')) {
      break
    }
  }

  const { data: fallbackShops, error: fallbackError } = await service
    .from('shops')
    .select('id, owner_id, name, slug, status')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  const fallback = ((fallbackShops ?? [])[0] as ShopRow | undefined) ?? null
  if (!fallback || fallbackError) {
    throw new Error('Failed to create or load seller shop')
  }

  return fallback
}

async function getAccessibleShops(auth: AccessContext): Promise<ShopRow[]> {
  if (auth.role === 'seller') {
    const shop = await ensureSellerShop(auth.user.id)
    return [shop]
  }

  const { data: shops, error } = await service
    .from('shops')
    .select('id, owner_id, name, slug, status')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    throw new Error(error.message)
  }

  return (shops ?? []) as ShopRow[]
}

async function getActiveCategories(): Promise<CategoryRow[]> {
  const { data, error } = await service
    .from('shop_categories')
    .select('name, slug, image_url')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .limit(200)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as CategoryRow[]
}

export async function GET(request: Request) {
  const auth = await requireProductManager(request)
  if ('error' in auth) return auth.error

  let shops: ShopRow[] = []
  let categories: CategoryRow[] = []
  try {
    shops = await getAccessibleShops(auth)
    categories = await getActiveCategories()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load shops'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const sellerShopIds = shops.map((shop) => shop.id)

  const query = service
    .from('shop_products')
    .select('id, title, description, price, stock, status, category, image_url, created_at, created_by, shop_id')
    .order('created_at', { ascending: false })
    .limit(300)

  if (auth.role === 'seller' && sellerShopIds.length > 0) {
    query.in('shop_id', sellerShopIds)
  }

  if (auth.role === 'seller' && sellerShopIds.length === 0) {
    return NextResponse.json({ products: [], shops: [] })
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: data ?? [], shops, categories })
}

export async function POST(request: Request) {
  const auth = await requireProductManager(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const requestedShopId = typeof body.shop_id === 'string' ? body.shop_id.trim() : ''
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

    const categories = await getActiveCategories()
    const categoryNames = new Set(categories.map((item) => item.name))

    if (!categoryNames.has(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const accessibleShops = await getAccessibleShops(auth)
    const selectedShop = accessibleShops.find((shop) => shop.id === requestedShopId) ?? accessibleShops[0] ?? null

    if (!selectedShop) {
      return NextResponse.json({ error: 'No shop available for this account' }, { status: 400 })
    }

    if (auth.role === 'seller' && selectedShop.owner_id !== auth.user.id) {
      return NextResponse.json({ error: 'You can only use your own shop' }, { status: 403 })
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
        created_by: selectedShop.owner_id,
        shop_id: selectedShop.id,
      })
      .select('id, title, description, price, stock, status, category, image_url, created_at, created_by, shop_id')
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
    const requestedShopId = typeof body.shop_id === 'string' ? body.shop_id.trim() : ''
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

    const categories = await getActiveCategories()
    const categoryNames = new Set(categories.map((item) => item.name))

    if (!categoryNames.has(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const accessibleShops = await getAccessibleShops(auth)
    const selectedShop = accessibleShops.find((shop) => shop.id === requestedShopId) ?? null

    if (!selectedShop) {
      return NextResponse.json({ error: 'Invalid shop selection' }, { status: 400 })
    }

    if (auth.role === 'seller' && selectedShop.owner_id !== auth.user.id) {
      return NextResponse.json({ error: 'You can only use your own shop' }, { status: 403 })
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
        shop_id: selectedShop.id,
        created_by: selectedShop.owner_id,
      })
      .eq('id', id)

    if (auth.role === 'seller') {
      updateQuery.eq('created_by', auth.user.id)
    }

    const { data, error } = await updateQuery
      .select('id, title, description, price, stock, status, category, image_url, created_at, created_by, shop_id')
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
