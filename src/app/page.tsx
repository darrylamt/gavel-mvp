import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import AuctionCard from '@/components/auction/AuctionCard'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function HomePage() {
  const { data: auctions } = await supabase
    .from('auctions')
    .select('id, title, current_price, ends_at')
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      {/* HERO */}
      <section className="mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Bid. Win. Own It.
        </h1>

        <p className="text-lg text-gray-600 max-w-xl mb-6">
          A live auction marketplace where every bid counts.
          Transparent bidding. Secure payments.
        </p>

        <div className="flex gap-4">
          <Link
            href="/auctions"
            className="bg-black text-white px-6 py-3 rounded-lg font-semibold"
          >
            Browse Auctions
          </Link>

          <Link
            href="/tokens"
            className="border border-black px-6 py-3 rounded-lg font-semibold"
          >
            Buy Tokens
          </Link>
        </div>
      </section>

      {/* FEATURED AUCTIONS */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            Featured Auctions
          </h2>

          <Link
            href="/auctions"
            className="text-sm font-semibold underline"
          >
            View all
          </Link>
        </div>

        {(!auctions || auctions.length === 0) && (
          <p className="text-gray-500">
            No auctions live yet.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions?.map((a) => (
            <AuctionCard
              key={a.id}
              id={a.id}
              title={a.title}
              currentPrice={a.current_price}
              endsAt={a.ends_at}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
