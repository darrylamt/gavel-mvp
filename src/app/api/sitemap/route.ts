import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get all active shop products
  const { data: products, error: productsError } = await supabase
    .from('shop_products')
    .select('id, updated_at')
    .eq('status', 'active')
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .limit(10000)

  // Get all public auctions
  const { data: auctions, error: auctionsError } = await supabase
    .from('auctions')
    .select('id, title, updated_at')
    .or('is_private.is.false,is_private.is.null')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(10000)

  const buildAuctionPath = (id: string, title?: string | null) => {
    const slug = (title || 'auction')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
    return `/auctions/${id}/${slug}`
  }

  const urls: string[] = []

  // Add shop products
  if (products) {
    products.forEach((product) => {
      urls.push(`${siteUrl}/shop/${product.id}`)
    })
  }

  // Add auctions
  if (auctions) {
    auctions.forEach((auction) => {
      urls.push(`${siteUrl}${buildAuctionPath(auction.id, auction.title)}`)
    })
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map((url) => `<url><loc>${url}</loc></url>`).join('\n  ')}
</urlset>`

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
