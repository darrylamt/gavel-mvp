import { createClient } from '@supabase/supabase-js'
import AuctionsGridClient from '@/components/auction/AuctionsGridClient'
import PrivateAuctionAccessForm from '@/components/auction/PrivateAuctionAccessForm'
import type { Metadata } from 'next'
import { buildAuctionPath } from '@/lib/seo'
import { getAuctionEngagementCounts } from '@/lib/serverAuctionEngagement'
import { Gavel } from 'lucide-react'

export const dynamic = 'force-dynamic'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

export const metadata: Metadata = {
  title: 'Browse Auctions',
  description: 'Explore active and upcoming auctions on Gavel Ghana.',
  alternates: {
    canonical: '/auctions',
  },
}

type Auction = {
  id: string
  title: string
  description?: string | null
  starting_price?: number | null
  current_price: number
  ends_at: string
  starts_at?: string | null
  status?: string | null
  image_url?: string | null
  images?: string[] | null
  reserve_price?: number | null
  min_increment?: number | null
  max_increment?: number | null
  is_private?: boolean
}

type EngagementCounts = Record<string, { bidderCount: number; watcherCount: number }>

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = (await searchParams) ?? {}
  const starredOnly = params.starred === '1'

  const { data: auctions } = await supabase
    .from('auctions')
    .select('id, title, description, starting_price, current_price, ends_at, starts_at, status, image_url, images, reserve_price, min_increment, max_increment, is_private')
    .or('is_private.is.false,is_private.is.null')
    .order('created_at', { ascending: false })

  const typedAuctions: Auction[] = (auctions ?? []) as Auction[]
  const engagementMap = await getAuctionEngagementCounts(typedAuctions.map((auction) => auction.id))
  const engagementCounts: EngagementCounts = {}
  for (const [auctionId, value] of engagementMap.entries()) {
    engagementCounts[auctionId] = value
  }

  const itemListStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: typedAuctions.slice(0, 30).map((auction, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${siteUrl}${buildAuctionPath(auction.id, auction.title)}`,
      name: auction.title,
    })),
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListStructuredData) }} />

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
            <Gavel className="h-4.5 w-4.5 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {starredOnly ? 'Starred Auctions' : 'Auctions'}
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          {starredOnly ? 'Items you have starred to bid on.' : 'Browse live, upcoming, and past auctions.'}
        </p>
      </div>

      {!starredOnly && <PrivateAuctionAccessForm />}

      <AuctionsGridClient auctions={typedAuctions} starredOnly={starredOnly} engagementCounts={engagementCounts} />
    </main>
  )
}
