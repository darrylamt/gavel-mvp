import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { parseAuctionMeta } from '@/lib/auctionMeta'
import { buildAuctionPath } from '@/lib/seo'

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      title: 'Auction',
      description: 'Auction details on Gavel Ghana.',
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data } = await supabase
    .from('auctions')
    .select('id, title, description, current_price, images, image_url')
    .eq('id', id)
    .maybeSingle()

  if (!data) {
    return {
      title: 'Auction not found',
      description: 'This auction is not available.',
      robots: { index: false, follow: false },
    }
  }

  const { description } = parseAuctionMeta(data.description)
  const metaDescription = (description || `Bid on ${data.title} on Gavel Ghana.`)
    .replace(/\s*•\s*/g, ' • ')
    .slice(0, 160)

  const canonicalPath = buildAuctionPath(data.id, data.title)
  const ogImage = data.images?.[0] || data.image_url || `${siteUrl}/share/auction/${data.id}/opengraph-image`

  return {
    title: data.title,
    description: metaDescription,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: 'website',
      url: `${siteUrl}${canonicalPath}`,
      title: data.title,
      description: metaDescription,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: metaDescription,
      images: [ogImage],
    },
  }
}

export default async function AuctionLayout({ children }: Props) {
  return children
}
