import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateListingEmbedding } from '@/lib/embeddings'
import { requireAdmin } from '@/lib/serverAdminAuth'

type AuctionRow = {
  id: string
  title: string | null
  description: string | null
}

type ProductRow = {
  id: string
  title: string | null
  description: string | null
  category: string | null
}

type BatchStats = {
  processed: number
  updated: number
  failed: number
  errors: string[]
}

const DEFAULT_BATCH_SIZE = 50
const MAX_BATCH_SIZE = 200
const DEFAULT_MAX_BATCHES = 20

function isServiceRoleAuthorized(request: Request): boolean {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!expected) return false

  const provided = request.headers.get('x-service-role-key')
  return !!provided && provided === expected
}

function sanitizeBatchSize(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_BATCH_SIZE
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(value)))
}

function sanitizeMaxBatches(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_MAX_BATCHES
  return Math.max(1, Math.min(100, Math.floor(value)))
}

async function backfillAuctions(service: any, batchSize: number): Promise<BatchStats> {
  const stats: BatchStats = { processed: 0, updated: 0, failed: 0, errors: [] }

  const { data, error } = await service
    .from('auctions')
    .select('id, title, description')
    .is('embedding', null)
    .order('created_at', { ascending: true })
    .limit(batchSize)

  const auctions: AuctionRow[] = (data ?? []) as AuctionRow[]

  if (error) {
    throw new Error(`Failed to fetch auctions for backfill: ${error.message}`)
  }

  for (const auction of auctions) {
    stats.processed += 1

    if (!auction.title || !auction.title.trim()) {
      stats.failed += 1
      if (stats.errors.length < 5) stats.errors.push(`auction:${auction.id}: empty title`)
      console.warn('[embeddings.backfill] Skipping auction with empty title', { auctionId: auction.id })
      continue
    }

    try {
      const embedding = await generateListingEmbedding({
        title: auction.title,
        description: auction.description || null,
        category: null,
      })

      const { error: updateError } = await service
        .from('auctions')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', auction.id)

      if (updateError) {
        stats.failed += 1
        if (stats.errors.length < 5) stats.errors.push(`auction:${auction.id}: ${updateError.message}`)
        console.warn('[embeddings.backfill] Failed updating auction embedding', {
          auctionId: auction.id,
          error: updateError.message,
        })
        continue
      }

      stats.updated += 1
    } catch (error) {
      stats.failed += 1
      if (stats.errors.length < 5) {
        stats.errors.push(`auction:${auction.id}: ${error instanceof Error ? error.message : String(error)}`)
      }
      console.warn('[embeddings.backfill] Failed generating auction embedding', {
        auctionId: auction.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return stats
}

async function backfillProducts(service: any, batchSize: number): Promise<BatchStats> {
  const stats: BatchStats = { processed: 0, updated: 0, failed: 0, errors: [] }

  const { data, error } = await service
    .from('shop_products')
    .select('id, title, description, category')
    .is('embedding', null)
    .order('created_at', { ascending: true })
    .limit(batchSize)

  const products: ProductRow[] = (data ?? []) as ProductRow[]

  if (error) {
    throw new Error(`Failed to fetch products for backfill: ${error.message}`)
  }

  for (const product of products) {
    stats.processed += 1

    if (!product.title || !product.title.trim()) {
      stats.failed += 1
      if (stats.errors.length < 5) stats.errors.push(`product:${product.id}: empty title`)
      console.warn('[embeddings.backfill] Skipping product with empty title', { productId: product.id })
      continue
    }

    try {
      const embedding = await generateListingEmbedding({
        title: product.title,
        description: product.description || null,
        category: product.category || null,
      })

      const { error: updateError } = await service
        .from('shop_products')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', product.id)

      if (updateError) {
        stats.failed += 1
        if (stats.errors.length < 5) stats.errors.push(`product:${product.id}: ${updateError.message}`)
        console.warn('[embeddings.backfill] Failed updating product embedding', {
          productId: product.id,
          error: updateError.message,
        })
        continue
      }

      stats.updated += 1
    } catch (error) {
      stats.failed += 1
      if (stats.errors.length < 5) {
        stats.errors.push(`product:${product.id}: ${error instanceof Error ? error.message : String(error)}`)
      }
      console.warn('[embeddings.backfill] Failed generating product embedding', {
        productId: product.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return stats
}

export async function POST(request: Request) {
  let service: any = null

  if (isServiceRoleAuthorized(request)) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
    }

    service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  } else {
    const admin = await requireAdmin(request)
    if (!admin.ok) return admin.error
    service = admin.service
  }

  try {
    const body = await request.json().catch(() => ({}))
    const batchSize = sanitizeBatchSize(body.batchSize)
    const maxBatches = sanitizeMaxBatches(body.maxBatches)

    let auctions = { processed: 0, updated: 0, failed: 0, errors: [] as string[] }
    let products = { processed: 0, updated: 0, failed: 0, errors: [] as string[] }
    let batchesRun = 0

    for (let i = 0; i < maxBatches; i += 1) {
      const [auctionStats, productStats] = await Promise.all([
        backfillAuctions(service, batchSize),
        backfillProducts(service, batchSize),
      ])

      batchesRun += 1
      auctions = {
        processed: auctions.processed + auctionStats.processed,
        updated: auctions.updated + auctionStats.updated,
        failed: auctions.failed + auctionStats.failed,
        errors: [...auctions.errors, ...auctionStats.errors].slice(0, 10),
      }
      products = {
        processed: products.processed + productStats.processed,
        updated: products.updated + productStats.updated,
        failed: products.failed + productStats.failed,
        errors: [...products.errors, ...productStats.errors].slice(0, 10),
      }

      if (auctionStats.processed === 0 && productStats.processed === 0) {
        break
      }
    }

    const [{ count: remainingAuctions }, { count: remainingProducts }] = await Promise.all([
      service
        .from('auctions')
        .select('id', { count: 'exact', head: true })
        .is('embedding', null),
      service
        .from('shop_products')
        .select('id', { count: 'exact', head: true })
        .is('embedding', null),
    ])

    return NextResponse.json({
      success: true,
      batchesRun,
      batchSize,
      maxBatches,
      auctions,
      products,
      remaining: {
        auctions: remainingAuctions ?? 0,
        products: remainingProducts ?? 0,
      },
    })
  } catch (error) {
    console.error('[embeddings.backfill] Request failed', error)
    const message = error instanceof Error ? error.message : 'Backfill failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
