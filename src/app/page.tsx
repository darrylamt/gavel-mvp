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
<section className="mb-20">
  <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
    Buy smarter.
    <br />
    Bid faster.
  </h1>

  <p className="text-lg text-gray-600 max-w-xl mb-8">
    A premium auction marketplace where every bid is transparent,
    secure, and powered by tokens.
  </p>

  <div className="flex gap-4">
    <Link
      href="/auctions"
      className="bg-black text-white px-8 py-4 rounded-xl font-semibold text-lg"
    >
      Browse Auctions
    </Link>

    <Link
      href="/tokens"
      className="border border-black px-8 py-4 rounded-xl font-semibold text-lg"
    >
      Buy Tokens
    </Link>
  </div>
</section>
    </main>
  )
}
