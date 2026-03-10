import type { Metadata } from 'next'
import { parseAuctionMeta } from '@/lib/auctionMeta'
import { buildAuctionPath } from '@/lib/seo'
import { normalizeAuctionImageUrls } from '@/lib/auctionImages'

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

type AuctionSeoRecord = {
  id: string
  title: string | null
  description: string | null
  image_url?: string | null
  images?: unknown
  status: string | null
  is_hidden?: boolean | null
  is_private?: boolean | null
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  const response = await fetch(`${siteUrl}/api/auctions/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  })

  const payload = response.ok
    ? ((await response.json()) as { auction?: AuctionSeoRecord })
    : null
  const data = payload?.auction ?? null

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
  const auctionTitle = data.title || 'Auction'
  const metaDescription = (description || `Bid on ${auctionTitle} on Gavel Ghana.`)
    .replace(/\s*•\s*/g, ' • ')
    .slice(0, 160)

  const canonicalPath = buildAuctionPath(data.id, auctionTitle)
  const normalizedImages = normalizeAuctionImageUrls(
    (data as { images?: unknown }).images,
    (data as { image_url?: string | null }).image_url ?? null
  )
  const ogImage = normalizedImages[0] || `${siteUrl}/share/auction/${data.id}/opengraph-image`

  return {
    title: auctionTitle,
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
      title: auctionTitle,
      description: metaDescription,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: auctionTitle,
      description: metaDescription,
      images: [ogImage],
    },
  }
}

export default async function AuctionLayout({ children }: Props) {
  return children
}
