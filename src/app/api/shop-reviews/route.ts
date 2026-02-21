import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const anon = createClient(supabaseUrl, anonKey)
const service = createClient(supabaseUrl, serviceKey)

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      data: { user },
      error: userError,
    } = await anon.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const productId = typeof body.product_id === 'string' ? body.product_id.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const reviewBody = typeof body.body === 'string' ? body.body.trim() : ''
    const rating = Number(body.rating)

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    if (!reviewBody) {
      return NextResponse.json({ error: 'Review text is required' }, { status: 400 })
    }

    const reviewerName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
      (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
      (user.email ? user.email.split('@')[0] : null)

    const { data: existing } = await service
      .from('shop_product_reviews')
      .select('id, status')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.status === 'pending') {
      return NextResponse.json({ error: 'You already have a pending review for this product.' }, { status: 400 })
    }

    const { error } = await service
      .from('shop_product_reviews')
      .insert({
        product_id: productId,
        user_id: user.id,
        reviewer_name: reviewerName,
        rating,
        title: title || null,
        body: reviewBody,
        status: 'pending',
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit review'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
