import { NextResponse } from 'next/server'
import { generateListingEmbedding } from '@/lib/embeddings'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { listingId, type, title, description, category } = await req.json()

    if (!listingId || !type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: listingId, type, and title' },
        { status: 400 }
      )
    }

    if (type !== 'auction' && type !== 'product') {
      return NextResponse.json({ error: 'Type must be auction or product' }, { status: 400 })
    }

    // Generate embedding
    const embedding = await generateListingEmbedding({
      title,
      description: description || null,
      category: category || null,
    })

    // Use service role to update the embedding
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update the appropriate table
    const tableName = type === 'auction' ? 'auctions' : 'shop_products'
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ embedding: `[${embedding.join(',')}]` })
      .eq('id', listingId)

    if (updateError) {
      console.error('Error updating embedding:', updateError)
      throw new Error(`Failed to save embedding: ${updateError.message}`)
    }

    return NextResponse.json({ success: true, message: 'Embedding generated successfully' })
  } catch (error) {
    console.error('Generate embedding error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate embedding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
