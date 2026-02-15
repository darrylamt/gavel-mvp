import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { parseAuctionMeta } from '@/lib/auctionMeta'

type AuctionRecord = {
  id: string
  title: string
  description: string | null
  current_price: number
  image_url: string | null
  images: string[] | null
}

type PageProps = {
  params: Promise<{ id: string }>
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getAuction(id: string) {
  const { data } = await supabase
    .from('auctions')
    .select('id, title, description, current_price, image_url, images')
    .eq('id', id)
    .single()

  return (data as AuctionRecord | null) ?? null
}

function targetHref(auction: AuctionRecord) {
  return `/auctions/${auction.id}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const auction = await getAuction(id)

  if (!auction) {
    return {
      title: 'Auction not found | Gavel',
      description: 'This auction is not available.',
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'
  const shareUrl = `${siteUrl}/share/auction/${auction.id}`
  const imageUrl = `${siteUrl}/share/auction/${auction.id}/opengraph-image`
  const { description: publicDescription } = parseAuctionMeta(auction.description)
  const description = (publicDescription || 'Bid on this auction on Gavel.')
    .replace(/\s*•\s*/g, ' • ')
    .slice(0, 180)

  return {
    title: `${auction.title} | Gavel Auction`,
    description,
    openGraph: {
      title: auction.title,
      description,
      url: shareUrl,
      type: 'website',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: auction.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: auction.title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function ShareAuctionPage({ params }: PageProps) {
  const { id } = await params
  const auction = await getAuction(id)

  if (!auction) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-3xl font-bold">Auction not found</h1>
        <p className="mt-3 text-gray-600">The shared auction link is no longer available.</p>
        <Link href="/auctions" className="mt-6 inline-flex rounded-lg border px-4 py-2 font-medium hover:bg-gray-50">
          Browse Auctions
        </Link>
      </main>
    )
  }

  const href = targetHref(auction)

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold">{auction.title}</h1>
      <p className="mt-3 text-gray-600">Current bid: GHS {auction.current_price.toLocaleString()}</p>
      <Link href={href} className="mt-6 inline-flex rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800">
        View Auction
      </Link>
    </main>
  )
}
