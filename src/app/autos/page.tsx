import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import AutoCard from '@/components/autos/AutoCard'
import { AUTO_MAKES, VEHICLE_TYPES } from '@/lib/autoUtils'
import { Car, Truck, Bus, Bike, Cog, Flame } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const VEHICLE_TYPE_ICONS: Record<string, React.ElementType> = {
  car: Car,
  suv: Car,
  truck: Truck,
  bus: Bus,
  motorbike: Bike,
  heavy_equipment: Cog,
}

export default async function AutosHomePage() {
  const [
    { count: activeCount },
    { count: soldCount },
    { data: featured },
    { data: activeAuctions },
  ] = await Promise.all([
    supabase.from('auto_listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('auto_listings').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    supabase.from('auto_listings').select('*, auto_auctions(*)').eq('status', 'active').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(6),
    supabase.from('auto_listings').select('*, auto_auctions(*)').eq('status', 'active').eq('listing_type', 'auction').order('created_at', { ascending: false }).limit(8),
  ])

  const stats = [
    { label: 'Vehicles Listed', value: String(activeCount ?? 0) },
    { label: 'Vehicles Sold', value: String(soldCount ?? 0) },
    { label: 'Regions', value: '16' },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative bg-[#1A1A2E] overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #E63946 0%, transparent 50%), radial-gradient(circle at 80% 30%, #252540 0%, transparent 60%)' }}
        />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <p className="text-[#E63946] font-semibold text-sm mb-3 tracking-wide uppercase">Ghana&apos;s Best Auto Marketplace</p>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              Ghana&apos;s Best Place to<br />Buy and Sell Vehicles
            </h1>
            <p className="text-white/70 text-lg mb-8">
              Auctions and fixed-price sales for cars, SUVs, trucks and more.
            </p>
            <form action="/autos/browse" method="get" className="bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl">
              <select name="make" className="flex-1 px-4 py-2.5 text-sm text-gray-700 outline-none rounded-xl bg-white border border-gray-200">
                <option value="">Any make</option>
                {AUTO_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select name="condition" className="px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none bg-white">
                <option value="">Any condition</option>
                <option value="brand_new">Brand New</option>
                <option value="foreign_used">Foreign Used</option>
                <option value="ghana_used">Ghana Used</option>
              </select>
              <button type="submit" className="bg-[#E63946] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#d42f3c] transition-colors whitespace-nowrap">
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12 space-y-14">

        {/* Featured */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Vehicles</h2>
              <p className="text-sm text-gray-500 mt-0.5">Top picks from verified sellers across Ghana</p>
            </div>
            <Link href="/autos/browse" className="text-sm font-semibold text-[#1A1A2E] hover:underline underline-offset-2">
              View all →
            </Link>
          </div>

          {!featured || featured.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-gray-100 p-4">
                  <Car className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
                </div>
              </div>
              <p className="font-semibold text-gray-700">No listings yet</p>
              <p className="text-sm text-gray-400 mt-1">Check back soon for vehicle listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((l) => <AutoCard key={l.id} listing={l as any} />)}
            </div>
          )}
        </section>

        {/* Live Auctions */}
        {activeAuctions && activeAuctions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold text-gray-900">Live Auto Auctions</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E63946]/10 border border-[#E63946]/30 px-2.5 py-0.5 text-xs font-bold text-[#E63946]">
                  <Flame className="h-3 w-3" /> Live
                </span>
              </div>
              <Link href="/autos/browse?listing_type=auction" className="text-sm font-semibold text-[#1A1A2E] hover:underline underline-offset-2">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeAuctions.map((l) => <AutoCard key={l.id} listing={l as any} />)}
            </div>
          </section>
        )}

        {/* Browse by make */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Make</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {AUTO_MAKES.filter(m => m !== 'Other').map((make) => (
              <Link
                key={make}
                href={`/autos/browse?make=${encodeURIComponent(make)}`}
                className="flex-shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-[#E63946]/50 hover:text-[#E63946] transition-colors whitespace-nowrap"
              >
                {make}
              </Link>
            ))}
          </div>
        </section>

        {/* Browse by vehicle type */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Type</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {VEHICLE_TYPES.map(({ value, label }) => {
              const Icon = VEHICLE_TYPE_ICONS[value] ?? Car
              return (
                <Link
                  key={value}
                  href={`/autos/browse?vehicle_type=${value}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-4 text-center hover:border-[#E63946]/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-center mb-2">
                    <div className="rounded-xl bg-gray-100 p-2.5 group-hover:bg-[#E63946]/10 transition-colors">
                      <Icon className="h-5 w-5 text-gray-500 group-hover:text-[#E63946] transition-colors" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-700 group-hover:text-[#E63946] transition-colors">{label}</p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Stats */}
        <section className="rounded-2xl bg-[#1A1A2E] p-8">
          <div className="grid grid-cols-3 gap-6">
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-[#E63946]">{value}</p>
                <p className="text-white/70 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  )
}
