import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { buildAuctionPath } from '@/lib/seo'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/auctions`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${siteUrl}/tokens`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return staticUrls
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: auctions } = await supabase
    .from('auctions')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(1000)

  const auctionUrls: MetadataRoute.Sitemap = (auctions ?? []).map((auction) => ({
    url: `${siteUrl}${buildAuctionPath(auction.id, auction.title)}`,
    changeFrequency: 'hourly',
    priority: 0.8,
  }))

  return [...staticUrls, ...auctionUrls]
}
