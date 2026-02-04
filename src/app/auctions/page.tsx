import { createClient } from '@supabase/supabase-js'
import AuctionCard from '@/components/auction/AuctionCard'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function AuctionsPage() {
  const { data: auctions } = await supabase
    .from('auctions')
    .select('id, title, current_price, end_time')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      {/* PAGE HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold mb-2">
          Auctions
        </h1>
        <p className="text-gray-600">
          Browse live and completed auctions. Bid using tokens and
          win securely.
        </p>
      </div>

      {/* AUCTIONS GRID */}
      {(!auctions || auctions.length === 0) && (
        <div className="border rounded-xl p-10 text-center text-gray-500">
          No auctions available yet.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {auctions?.map((auction) => (
          <AuctionCard
            key={auction.id}
            id={auction.id}
            title={auction.title}
            currentPrice={auction.current_price}
            endsAt={auction.end_time}
          />

        ))}
      </div>
    </main>
  )
}
