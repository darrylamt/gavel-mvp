// src/app/page.tsx

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import AuctionCard from '@/components/auction/AuctionCard'
import { getAuctionEngagementCounts } from '@/lib/serverAuctionEngagement'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function HomePage() {
  const nowIso = new Date().toISOString()

  const { data: auctions } = await supabase
    .from('auctions')
    .select('id, title, current_price, ends_at, starts_at, status, image_url')
    .in('status', ['active', 'scheduled'])
    .gt('ends_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: startingSoon } = await supabase
    .from('auctions')
    .select('id, title, current_price, ends_at, starts_at, status, image_url')
    .gt('starts_at', nowIso)
    .neq('status', 'ended')
    .order('starts_at', { ascending: true })
    .limit(6)

  const allAuctionIds = Array.from(
    new Set([...(auctions ?? []).map((auction) => auction.id), ...(startingSoon ?? []).map((auction) => auction.id)])
  )

  const engagementCounts = await getAuctionEngagementCounts(allAuctionIds)

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

        {/* HERO IMAGE */}
        <div className="hidden lg:flex h-80 rounded-2xl overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80"
            alt="Hero"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* STARTING SOON */}
      {startingSoon && startingSoon.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Starting Soon</h2>
            <Link href="/auctions" className="text-sm font-semibold underline">View all</Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {startingSoon.map((a: any) => (
              (() => {
                const counts = engagementCounts.get(a.id) ?? { bidderCount: 0, watcherCount: 0 }
                return (
              <AuctionCard
                key={a.id}
                id={a.id}
                title={a.title}
                currentPrice={a.current_price}
                endsAt={a.ends_at}
                startsAt={a.starts_at}
                status={a.status}
                imageUrl={a.image_url}
                bidderCount={counts.bidderCount}
                watcherCount={counts.watcherCount}
              />
                )
              })()
            ))}
          </div>
        </section>
      )}

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
            (() => {
              const counts = engagementCounts.get(a.id) ?? { bidderCount: 0, watcherCount: 0 }
              return (
            <AuctionCard
              key={a.id}
              id={a.id}
              title={a.title}
              currentPrice={a.current_price}
              endsAt={a.ends_at}
              startsAt={a.starts_at}
              status={a.status}
              imageUrl={a.image_url}
              bidderCount={counts.bidderCount}
              watcherCount={counts.watcherCount}
            />
              )
            })()
          ))}
        </div>
      </section>
    </main>
  )
}
