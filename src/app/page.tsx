// src/app/page.tsx

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
    <main className="max-w-7xl mx-auto px-6 py-14">
      {/* HERO */}
      <section className="mb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            A smarter way to{' '}
            <span className="text-gray-400">bid & win</span>
          </h1>

          <p className="text-lg text-gray-600 max-w-xl mb-8">
            Gavel is a modern auction marketplace.
            Buy tokens, place bids, and win items transparently —
            no hidden tricks.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/auctions"
              className="bg-black text-white px-7 py-3 rounded-lg font-semibold hover:opacity-90"
            >
              Browse Auctions
            </Link>

            <Link
              href="/tokens"
              className="border border-black px-7 py-3 rounded-lg font-semibold hover:bg-black hover:text-white transition"
            >
              Buy Tokens
            </Link>
          </div>
        </div>

        {/* HERO IMAGE PLACEHOLDER */}
        <div className="hidden lg:flex h-80 bg-gray-100 rounded-2xl items-center justify-center text-gray-400 text-lg">
          Product imagery coming soon
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
          <div className="border rounded-xl p-12 text-center text-gray-500">
            No auctions available yet.
          </div>
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
