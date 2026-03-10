import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { parseAuctionMeta } from '@/lib/auctionMeta'
import { buildAuctionPath } from '@/lib/seo'
import { normalizeAuctionImageUrls } from '@/lib/auctionImages'

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      title: 'Auction',
      description: 'Auction details on Gavel Ghana.',
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey)

  const { data } = await supabase
    .from('auctions')
    .select('id, title, description, current_price, images, image_url, status, is_hidden, is_private')
    .eq('id', id)
    .maybeSingle()

  if (!data) {
    return {
      title: 'Auction',
      description: 'Auction details on Gavel Ghana.',
      robots: { index: false, follow: false },
    }
  }

  if (data.is_private) {
    return {
      title: data.title || 'Private auction',
      description: 'This auction is private and not publicly indexable.',
      robots: { index: false, follow: false },
    }
  }

  if (data.status === 'scheduled' && data.is_hidden) {
    return {
      title: data.title || 'Auction preview',
      description: 'This auction is not publicly available yet.',
      robots: { index: false, follow: false },
    }
  }

  const { description } = parseAuctionMeta(data.description)
  const metaDescription = (description || `Bid on ${data.title} on Gavel Ghana.`)
    .replace(/\s*•\s*/g, ' • ')
    .slice(0, 160)

  const canonicalPath = buildAuctionPath(data.id, data.title)
  const normalizedImages = normalizeAuctionImageUrls(
    (data as { images?: unknown }).images,
    (data as { image_url?: string | null }).image_url ?? null
  )
  const ogImage = normalizedImages[0] || `${siteUrl}/share/auction/${data.id}/opengraph-image`

  return {
    title: data.title,
    description: metaDescription,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    alternates: {
      canonical: `${siteUrl}${canonicalPath}`,
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
