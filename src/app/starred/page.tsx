import { createClient } from '@supabase/supabase-js'
import StarredContentClient from '@/components/starred/StarredContentClient'
import { getAuctionEngagementCounts } from '@/lib/serverAuctionEngagement'

export const dynamic = 'force-dynamic'

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

type ShopProduct = {
  id: string
  title: string
  description: string | null
  price: number
  stock: number
  category: string
  image_url: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function StarredAuctionsPage() {
  const [{ data: auctions }, { data: products }] = await Promise.all([
    supabase
      .from('auctions')
      .select('id, title, description, starting_price, current_price, ends_at, starts_at, status, image_url, images, reserve_price, min_increment, max_increment')
      .order('created_at', { ascending: false }),
    supabase
      .from('shop_products')
      .select('id, title, description, price, stock, category, image_url')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  const typedAuctions: Auction[] = (auctions ?? []) as Auction[]
  const typedProducts: ShopProduct[] = (products ?? []) as ShopProduct[]
  const engagementMap = await getAuctionEngagementCounts(typedAuctions.map((auction) => auction.id))
  const engagementCounts: EngagementCounts = {}
  for (const [auctionId, value] of engagementMap.entries()) {
    engagementCounts[auctionId] = value
  }

  return (
    <StarredContentClient auctions={typedAuctions} products={typedProducts} engagementCounts={engagementCounts} />
  )
}
