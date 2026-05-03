import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import PropertyCard from '@/components/properties/PropertyCard'
import { Home, Layers, Building2, Building, Flame } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PROPERTY_TYPE_ICONS = {
  land:        { Icon: Layers,    label: 'Land',        desc: 'Plots & parcels' },
  residential: { Icon: Home,      label: 'Residential', desc: 'Homes & apartments' },
  commercial:  { Icon: Building2, label: 'Commercial',  desc: 'Offices & retail' },
  industrial:  { Icon: Building,  label: 'Industrial',  desc: 'Warehouses & factories' },
}

export default async function PropertiesHomePage() {
  const [
    { count: activeCount },
    { count: soldCount },
    { data: featured },
    { data: activeAuctions },
  ] = await Promise.all([
    supabase.from('property_listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('property_listings').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    supabase.from('property_listings').select('*, property_auctions(*)').eq('status', 'active').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(6),
    supabase.from('property_listings').select('*, property_auctions(*)').eq('status', 'active').eq('listing_type', 'auction').order('created_at', { ascending: false }).limit(8),
  ])

  const stats = [
    { label: 'Active Listings', value: String(activeCount ?? 0) },
    { label: 'Properties Sold', value: String(soldCount ?? 0) },
    { label: 'Regions Covered', value: '16' },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative bg-[#0F2557] overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #C9A84C 0%, transparent 60%), radial-gradient(circle at 80% 20%, #1a3570 0%, transparent 50%)' }}
        />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <p className="text-[#C9A84C] font-semibold text-sm mb-3 tracking-wide uppercase">Ghana&apos;s Most Trusted</p>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              Ghana&apos;s Most Trusted<br />Property Marketplace
            </h1>
            <p className="text-white/70 text-lg mb-8">
              Buy, sell and auction land, homes and commercial property with confidence.
            </p>
            <form action="/properties/browse" method="get" className="bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl">
              <input name="q" type="text" placeholder="Location, area or neighbourhood..."
                className="flex-1 px-4 py-2.5 text-sm text-gray-900 outline-none rounded-xl" />
              <select name="type" className="px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none bg-white">
                <option value="">Any type</option>
                <option value="land">Land</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
              </select>
              <button type="submit" className="bg-[#C9A84C] text-[#0F2557] font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#d4b55c] transition-colors whitespace-nowrap">
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12 space-y-14">

        {/* Featured listings */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Listings</h2>
              <p className="text-sm text-gray-500 mt-0.5">Handpicked properties from across Ghana</p>
            </div>
            <Link href="/properties/browse" className="text-sm font-semibold text-[#0F2557] hover:underline underline-offset-2">
              View all →
            </Link>
          </div>

          {!featured || featured.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-gray-100 p-4">
                  <Home className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
                </div>
              </div>
              <p className="font-semibold text-gray-700">No listings yet</p>
              <p className="text-sm text-gray-400 mt-1">Check back soon for property listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((l) => <PropertyCard key={l.id} listing={l as any} />)}
            </div>
          )}
        </section>

        {/* Active Auctions */}
        {activeAuctions && activeAuctions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold text-gray-900">Live Property Auctions</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 px-2.5 py-0.5 text-xs font-bold text-[#C9A84C]">
                  <Flame className="h-3 w-3" /> Live
                </span>
              </div>
              <Link href="/properties/browse?listing_type=auction" className="text-sm font-semibold text-[#0F2557] hover:underline underline-offset-2">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeAuctions.map((l) => <PropertyCard key={l.id} listing={l as any} />)}
            </div>
          </section>
        )}

        {/* Stats bar */}
        <section className="rounded-2xl bg-[#0F2557] p-8">
          <div className="grid grid-cols-3 gap-6">
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-[#C9A84C]">{value}</p>
                <p className="text-white/70 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Browse by type */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Property Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.entries(PROPERTY_TYPE_ICONS) as [string, { Icon: React.ElementType; label: string; desc: string }][]).map(([type, { Icon, label, desc }]) => (
              <Link
                key={type}
                href={`/properties/browse?property_type=${type}`}
                className="group rounded-2xl border border-gray-200 bg-white p-5 hover:border-[#C9A84C]/50 hover:shadow-md transition-all"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F2557]/8 group-hover:bg-[#C9A84C]/15 transition-colors">
                  <Icon className="h-5 w-5 text-[#0F2557] group-hover:text-[#C9A84C] transition-colors" strokeWidth={1.5} />
                </div>
                <p className="font-bold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </>
  )
}
