import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/apiAuth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await params
  const productId = String(resolved.id || '').trim()

  if (!productId) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('shop_products')
    .select('id, title, description, image_url, image_urls, status, category, price, stock, shop_id')
    .eq('id', productId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ product: data })
}