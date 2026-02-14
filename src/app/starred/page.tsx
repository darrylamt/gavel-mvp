import { createClient } from '@supabase/supabase-js'
import AuctionsGridClient from '@/components/auction/AuctionsGridClient'

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function StarredAuctionsPage() {
  const { data: auctions } = await supabase
    .from('auctions')
    .select('id, title, description, starting_price, current_price, ends_at, starts_at, status, image_url, images, reserve_price, min_increment, max_increment')
    .order('created_at', { ascending: false })

  const typedAuctions: Auction[] = (auctions ?? []) as Auction[]

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold mb-2">Starred Auctions</h1>
        <p className="text-gray-600">Items you have starred to bid on.</p>
      </div>

      <AuctionsGridClient auctions={typedAuctions} starredOnly />
    </main>
  )
}
