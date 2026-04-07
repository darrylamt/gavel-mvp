import { NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embeddings'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

type SearchResult = {
  id: string
  title: string
  description: string | null
  category: string | null
  price: number
  image_url: string | null
  type: 'auction' | 'product'
  similarity: number
}

export async function POST(req: Request) {
  // Rate limit: 30 searches per minute per IP
  const ip = getClientIp(req)
  const rl = rateLimit('search', ip, 30, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs)

  try {
    const { query } = await req.json()

    // Return empty result for empty query
    if (!query || !query.trim()) {
      return NextResponse.json({ results: [], noResults: false })
    }

    const cleanQuery = query.trim()

    // Use service role to call the search function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Try semantic search first, fallback to text search
    let results: SearchResult[] = []

    try {
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(cleanQuery)

      // Call the search_listings function
      const { data, error } = await supabase.rpc('search_listings', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: 0.25,
        match_count: 20,
      })

      if (!error && data) {
        results = (data || []) as SearchResult[]
      }
    } catch (embeddingError) {
      console.warn('Embedding search failed, falling back to text search:', embeddingError)
    }

    // If no results from semantic search, try text-based search
    if (results.length === 0) {
      // Search auctions
      const { data: auctionData } = await supabase
        .from('auctions')
        .select('id, title, description, current_price, image_url, images')
        .eq('status', 'active')
        .or(`title.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`)
        .limit(10)

      // Search products
      const { data: productData } = await supabase
        .from('shop_products')
        .select('id, title, description, price, image_url, image_urls, category')
        .eq('status', 'active')
        .or(`title.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%,category.ilike.%${cleanQuery}%`)
        .limit(10)

      results = [
        ...(auctionData || []).map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: null,
          price: item.current_price || 0,
          image_url: item.image_url || (item.images && item.images.length > 0 ? item.images[0] : null),
          type: 'auction' as const,
          similarity: 0.8
        })),
        ...(productData || []).map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          price: item.price,
          image_url: item.image_url || (item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : null),
          type: 'product' as const,
          similarity: 0.8
        }))
      ]
    }

    return NextResponse.json({
      results: results.slice(0, 20),
      noResults: results.length === 0,
      query: cleanQuery,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed. Please try again.', results: [], noResults: true }, { status: 500 })
  }
}
