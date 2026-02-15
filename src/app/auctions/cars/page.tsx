import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type CarSpecs = {
  odometer?: string
  location?: string
}

export const dynamic = 'force-dynamic'

type Auction = {
  id: string
  title: string
  description?: string | null
  auction_type?: 'normal' | 'car' | null
  car_specs?: CarSpecs | null
  current_price: number
  ends_at: string
  starts_at?: string | null
  status?: string | null
  image_url?: string | null
  images?: string[] | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function CarAuctionsPage() {
  const { data } = await supabase
    .from('auctions')
    .select('id, title, description, auction_type, car_specs, current_price, ends_at, starts_at, status, image_url, images')
    .eq('auction_type', 'car')
    .order('created_at', { ascending: false })

  const auctions: Auction[] = (data ?? []) as Auction[]

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold">Car Auctions</h1>
          <p className="mt-2 text-gray-600">Browse vehicle auctions with full specifications and live bids.</p>
        </div>
        <Link href="/auctions" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
          All Auctions
        </Link>
      </div>

      {auctions.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center text-gray-500">No car auctions available yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {auctions.map((auction) => {
            const image = auction.images?.[0] || auction.image_url || ''
            const location = auction.car_specs?.location || 'Location unavailable'
            const odometer = auction.car_specs?.odometer || 'Odometer unavailable'

            return (
              <Link
                key={auction.id}
                href={`/auctions/cars/${auction.id}`}
                className="overflow-hidden rounded-2xl border bg-white transition hover:shadow-md"
              >
                <div className="grid md:grid-cols-[220px_1fr]">
                  <div className="h-52 bg-gray-100">
                    {image ? (
                      <img src={image} alt={auction.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="text-xl font-bold">{auction.title}</h2>
                    <p className="mt-2 text-sm text-gray-600">{location}</p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-gray-500">Current bid</p>
                        <p className="font-semibold text-black">GHS {auction.current_price.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-gray-500">Odometer</p>
                        <p className="font-semibold text-black">{odometer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
