import { createClient } from '@supabase/supabase-js'
import AuctionCard from '@/components/auction/AuctionCard'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function AuctionsPage() {
  const { data: auctions } = await supabase
    .from('auctions')
    .select('id, title, current_price, ends_at')
    .order('created_at', { ascending: false })

return (
  <main className="max-w-7xl mx-auto px-6 py-12">
    <div className="mb-10">
      <h1 className="text-4xl font-extrabold mb-2">
        Auctions
      </h1>
      <p className="text-gray-600">
        Browse live and completed auctions.
      </p>
    </div>

    {(!auctions || auctions.length === 0) && (
      <div className="border rounded-2xl p-12 text-center text-gray-500">
        No auctions available yet.
      </div>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {auctions?.map((auction) => (
        <AuctionCard
          key={auction.id}
          id={auction.id}
          title={auction.title}
          currentPrice={auction.current_price}
          endsAt={auction.ends_at}
        />
      ))}
    </div>
  </main>
)
}
