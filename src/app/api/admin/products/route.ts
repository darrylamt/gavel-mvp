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

type ProductVariantInput = {
  id?: string
  color?: string | null
  size?: string | null
  sku?: string | null
  image_url?: string | null
  price: number
  stock: number
  is_default?: boolean
  is_active?: boolean
}

type ProductVariantRow = {
  id: string
  product_id: string
  color: string | null
  size: string | null
  sku: string | null
  image_url: string | null
  price: number
  seller_base_price: number | null
  stock: number
  is_default: boolean
  is_active: boolean
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

function normalizeVariantInput(rawVariants: unknown): ProductVariantInput[] | null {
  if (rawVariants === undefined) {
    return null
  }

  if (!Array.isArray(rawVariants)) {
    throw new Error('Variants must be an array')
  }

  return rawVariants.map((item) => {
    const value = item as Record<string, unknown>
    const id = typeof value.id === 'string' ? value.id.trim() : ''
    const color = typeof value.color === 'string' ? value.color.trim() : ''
    const size = typeof value.size === 'string' ? value.size.trim() : ''
    const sku = typeof value.sku === 'string' ? value.sku.trim() : ''
    const imageUrl = typeof value.image_url === 'string' ? value.image_url.trim() : ''
    const price = Number(value.price)
    const stock = Number(value.stock)

    if (!Number.isFinite(price) || price < 0) {
      throw new Error('Each variant price must be 0 or greater')
    }

    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error('Each variant stock must be 0 or greater')
    }

    return {
      id: id || undefined,
      color: color || null,
      size: size || null,
      sku: sku || null,
      image_url: imageUrl || null,
      price,
      stock: Math.floor(stock),
      is_default: Boolean(value.is_default),
      is_active: value.is_active === undefined ? true : Boolean(value.is_active),
    }
  })
}

async function syncProductVariants(params: {
  productId: string
  variants: ProductVariantInput[]
  role: 'admin' | 'seller'
}) {
  const { productId, variants, role } = params

  const normalized = variants.map((variant) => {
    const listingPrice = role === 'seller' ? Number((variant.price * 1.1).toFixed(2)) : Number(variant.price.toFixed(2))
    const sellerBasePrice = role === 'seller' ? Number(variant.price.toFixed(2)) : null
    return {
      id: variant.id,
      color: variant.color ?? null,
      size: variant.size ?? null,
      sku: variant.sku ?? null,
      image_url: variant.image_url ?? null,
      price: listingPrice,
      seller_base_price: sellerBasePrice,
      stock: Math.max(0, Math.floor(variant.stock)),
      is_default: Boolean(variant.is_default),
      is_active: variant.is_active === undefined ? true : Boolean(variant.is_active),
    }
  })

  if (normalized.length > 0 && !normalized.some((variant) => variant.is_default && variant.is_active)) {
    normalized[0].is_default = true
    normalized[0].is_active = true
  }

  const { data: existing, error: existingError } = await service
    .from('shop_product_variants')
    .select('id')
    .eq('product_id', productId)

  if (existingError) {
    throw new Error(existingError.message)
  }

  const existingIds = new Set((existing ?? []).map((row) => String(row.id)))
  const keptIds = new Set<string>()

  for (const variant of normalized) {
    if (variant.id && existingIds.has(variant.id)) {
      keptIds.add(variant.id)
      const { error: updateError } = await service
        .from('shop_product_variants')
        .update({
          color: variant.color,
          size: variant.size,
          sku: variant.sku,
          image_url: variant.image_url,
          price: variant.price,
          seller_base_price: variant.seller_base_price,
          stock: variant.stock,
          is_default: variant.is_default,
          is_active: variant.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variant.id)
        .eq('product_id', productId)

      if (updateError) {
        throw new Error(updateError.message)
      }
    } else {
      const { data: inserted, error: insertError } = await service
        .from('shop_product_variants')
        .insert({
          product_id: productId,
          color: variant.color,
          size: variant.size,
          sku: variant.sku,
          image_url: variant.image_url,
          price: variant.price,
          seller_base_price: variant.seller_base_price,
          stock: variant.stock,
          is_default: variant.is_default,
          is_active: variant.is_active,
        })
        .select('id')
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      if (inserted?.id) {
        keptIds.add(String(inserted.id))
      }
    }
  }

  const idsToDeactivate = [...existingIds].filter((id) => !keptIds.has(id))
  if (idsToDeactivate.length > 0) {
    const { error: deactivateError } = await service
      .from('shop_product_variants')
      .update({ is_active: false, is_default: false, updated_at: new Date().toISOString() })
      .in('id', idsToDeactivate)
      .eq('product_id', productId)

    if (deactivateError) {
      throw new Error(deactivateError.message)
    }
  }

  if (normalized.length === 0 && existingIds.size > 0) {
    const { error: deactivateAllError } = await service
      .from('shop_product_variants')
      .update({ is_active: false, is_default: false, updated_at: new Date().toISOString() })
      .eq('product_id', productId)

    if (deactivateAllError) {
      throw new Error(deactivateAllError.message)
    }
  }
}

async function hydrateProductsWithVariants<T extends { id: string }>(products: T[]) {
  if (products.length === 0) {
    return products.map((product) => ({ ...product, variants: [] as ProductVariantRow[] }))
  }

  const productIds = products.map((product) => product.id)
  const { data: variants, error } = await service
    .from('shop_product_variants')
    .select('id, product_id, color, size, sku, image_url, price, seller_base_price, stock, is_default, is_active')
    .in('product_id', productIds)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const variantMap = new Map<string, ProductVariantRow[]>()
  for (const variant of (variants ?? []) as ProductVariantRow[]) {
    const key = String(variant.product_id)
    const current = variantMap.get(key) ?? []
    current.push(variant)
    variantMap.set(key, current)
  }

  return products.map((product) => ({
    ...product,
    variants: variantMap.get(product.id) ?? [],
  }))
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
    .select('id, title, description, price, seller_base_price, stock, status, category, image_url, created_at, created_by, shop_id')
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

  try {
    const hydrated = await hydrateProductsWithVariants((data ?? []) as Array<{ id: string }>)
    return NextResponse.json({ products: hydrated, shops, categories })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load product variants'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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
    const imageUrls = Array.isArray(body.image_urls) ? body.image_urls.filter((u: any) => typeof u === 'string' && u.trim() !== '') : []
    const price = Number(body.price)
    const stock = Number(body.stock)
    const variants = normalizeVariantInput(body.variants)

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (variants === null && (!Number.isFinite(price) || price < 0)) {
      return NextResponse.json({ error: 'Price must be 0 or greater' }, { status: 400 })
    }

    if (variants === null && (!Number.isFinite(stock) || stock < 0)) {
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

    const effectivePrice = Number.isFinite(price) && price >= 0 ? price : 0
    const effectiveStock = Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0
    const listingPrice = auth.role === 'seller' ? Number((effectivePrice * 1.1).toFixed(2)) : effectivePrice
    const sellerBasePrice = auth.role === 'seller' ? Number(effectivePrice.toFixed(2)) : null

    const { data, error } = await service
      .from('shop_products')
      .insert({
        title,
        description: description || null,
        price: listingPrice,
        seller_base_price: sellerBasePrice,
        stock: effectiveStock,
        status,
        category,
        image_urls: imageUrls,
        created_by: selectedShop.owner_id,
        shop_id: selectedShop.id,
      })
      .select('id, title, description, price, seller_base_price, stock, status, category, image_urls, created_at, created_by, shop_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (variants !== null) {
      await syncProductVariants({
        productId: String(data.id),
        variants,
        role: auth.role,
      })
    }

    const hydrated = await hydrateProductsWithVariants([data as { id: string }])

    return NextResponse.json({ product: hydrated[0] })
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
    const variants = normalizeVariantInput(body.variants)

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (variants === null && (!Number.isFinite(price) || price < 0)) {
      return NextResponse.json({ error: 'Price must be 0 or greater' }, { status: 400 })
    }

    if (variants === null && (!Number.isFinite(stock) || stock < 0)) {
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

    const effectivePrice = Number.isFinite(price) && price >= 0 ? price : 0
    const effectiveStock = Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0
    const listingPrice = auth.role === 'seller' ? Number((effectivePrice * 1.1).toFixed(2)) : effectivePrice
    const sellerBasePrice = auth.role === 'seller' ? Number(effectivePrice.toFixed(2)) : null

    const updatePayload: {
      title: string
      description: string | null
      price: number
      stock: number
      status: string
      category: string
      image_url: string | null
      shop_id: string
      created_by: string
      seller_base_price?: number
    } = {
      title,
      description: description || null,
      price: listingPrice,
      stock: effectiveStock,
      status,
      category,
      image_url: imageUrl || null,
      shop_id: selectedShop.id,
      created_by: selectedShop.owner_id,
    }

    if (auth.role === 'seller') {
      updatePayload.seller_base_price = sellerBasePrice ?? 0
    }

    const updateQuery = service
      .from('shop_products')
      .update(updatePayload)
      .eq('id', id)

    if (auth.role === 'seller') {
      updateQuery.eq('created_by', auth.user.id)
    }

    const { data, error } = await updateQuery
      .select('id, title, description, price, seller_base_price, stock, status, category, image_url, created_at, created_by, shop_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (variants !== null) {
      await syncProductVariants({
        productId: String(data.id),
        variants,
        role: auth.role,
      })
    }

    const hydrated = await hydrateProductsWithVariants([data as { id: string }])

    return NextResponse.json({ product: hydrated[0] })
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
