import { createClient } from '@supabase/supabase-js'
import AuctionsGridClient from '@/components/auction/AuctionsGridClient'
import type { Metadata } from 'next'
import { buildAuctionPath } from '@/lib/seo'
import { getAuctionEngagementCounts } from '@/lib/serverAuctionEngagement'

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
    .select('id, title, description, starting_price, current_price, ends_at, starts_at, status, image_url, images, reserve_price, min_increment, max_increment')
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
  <main className="max-w-7xl mx-auto px-6 py-12">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListStructuredData) }} />
    <div className="mb-10 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-4xl font-extrabold mb-2">
          {starredOnly ? 'Starred Auctions' : 'Auctions'}
        </h1>
        <p className="text-gray-600">
          {starredOnly ? 'Items you have starred to bid on.' : 'Browse live and completed auctions.'}
        </p>
      </div>
      <div />
    </div>

    <AuctionsGridClient auctions={typedAuctions} starredOnly={starredOnly} engagementCounts={engagementCounts} />
  </main>
)
}
