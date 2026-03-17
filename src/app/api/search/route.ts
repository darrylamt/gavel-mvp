import { NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embeddings'
import { createClient } from '@supabase/supabase-js'

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
  try {
    const { query } = await req.json()

    // Return empty result for empty query
    if (!query || !query.trim()) {
      return NextResponse.json({ results: [], noResults: false })
    }

    const cleanQuery = query.trim()

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(cleanQuery)

    // Use service role to call the search function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the search_listings function
    const { data, error } = await supabase.rpc('search_listings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 20,
    })

    if (error) {
      console.error('Search error:', error)
      throw new Error(`Search failed: ${error.message}`)
    }

    const results = (data || []) as SearchResult[]

    return NextResponse.json({
      results,
      noResults: results.length === 0,
      query: cleanQuery,
    })
  } catch (error) {
    console.error('Search API error:', error)
    const message = error instanceof Error ? error.message : 'Search failed'
    return NextResponse.json({ error: message, results: [], noResults: true }, { status: 500 })
  }
}
