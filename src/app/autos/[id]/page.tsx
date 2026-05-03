import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, ChevronLeft, CheckCircle2, XCircle, Car } from 'lucide-react'
import type { Metadata } from 'next'
import type { AutoListingWithAuction } from '@/types/autos'
import { formatGhsPrice, formatMileage, CONDITION_CONFIG } from '@/lib/autoUtils'
import AutoDetailClient from './AutoDetailClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data } = await supabase
    .from('auto_listings')
    .select('title, make, model, year, price, city, region, listing_type')
    .eq('id', params.id)
    .single()

  if (!data) return { title: 'Vehicle | Gavel Autos' }

  const priceStr = data.price ? ` — ${formatGhsPrice(data.price)}` : ''

  if (data.listing_type === 'auction') {
    return {
      title: `${data.year} ${data.make} ${data.model} auction | Gavel Autos`,
      description: `${data.title} in ${data.city ?? data.region}${priceStr}`,
    }
  }

  return {
    title: `${data.year} ${data.make} ${data.model} for sale in ${data.city ?? data.region} | Gavel Autos`,
    description: `${data.title}${priceStr}`,
  }
}

export default async function AutoDetailPage({ params }: { params: { id: string } }) {
  const { data: listing } = await supabase
    .from('auto_listings')
    .select('*, auto_auctions(*), profiles(username, avatar_url)')
    .eq('id', params.id)
    .single()

  if (!listing || listing.status === 'archived') notFound()

  const l = listing as AutoListingWithAuction & { profiles: { username: string | null; avatar_url: string | null } | null }
  const auction = l.auto_auctions?.[0]
  const isAuction = l.listing_type === 'auction'
  const images = l.images ?? []
  const conditionCfg = CONDITION_CONFIG[l.condition]

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
      {/* Back */}
      <Link href="/autos/browse" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="h-4 w-4" />
        Back to listings
      </Link>

      {/* Image gallery */}
      {images.length > 0 ? (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-2xl overflow-hidden max-h-[480px]">
            <div className="relative h-64 md:h-full">
              <img src={images[0]} alt={l.title} className="h-full w-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-2 gap-2 h-64 md:h-full">
                {images.slice(1, 5).map((img, i) => (
                  <div key={i} className="relative overflow-hidden">
                    <img src={img} alt={`${l.title} ${i + 2}`} className="h-full w-full object-cover" />
                    {i === 3 && images.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">+{images.length - 5}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Thumbnail strip */}
          {images.length > 2 && (
            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <img key={i} src={img} alt="" className="h-14 w-20 rounded-lg object-cover flex-shrink-0 border-2 border-transparent hover:border-[#E63946] transition-colors cursor-pointer" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#252540] h-48 flex items-center justify-center mb-8">
          <Car className="h-16 w-16 text-white/20" strokeWidth={1} />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left */}
        <div className="md:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${conditionCfg.color}`}>
                {conditionCfg.label}
              </span>
              {isAuction && (
                <span className="rounded-full bg-[#E63946] text-white text-xs font-bold px-3 py-1">Live Auction</span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-1">{l.year} {l.make} {l.model}</h1>
            <p className="text-gray-500 text-sm mb-2">{l.title}</p>
            {(l.city || l.region) && (
              <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{l.city ? `${l.city}, ` : ''}{l.region}</span>
              </div>
            )}
          </div>

          {/* Key specs bar */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: 'Year', value: String(l.year) },
              ...(l.mileage != null && l.condition !== 'brand_new' ? [{ label: 'Mileage', value: formatMileage(l.mileage) }] : []),
              ...(l.transmission ? [{ label: 'Trans.', value: l.transmission.charAt(0).toUpperCase() + l.transmission.slice(1) }] : []),
              ...(l.fuel_type ? [{ label: 'Fuel', value: l.fuel_type.charAt(0).toUpperCase() + l.fuel_type.slice(1) }] : []),
              ...(l.drive_type ? [{ label: 'Drive', value: l.drive_type.toUpperCase() }] : []),
              ...(l.color ? [{ label: 'Color', value: l.color }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 text-center">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {l.description && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-2">About this vehicle</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{l.description}</p>
            </div>
          )}

          {/* Full specs */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Full Specifications</h2>
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              {[
                { label: 'Make', value: l.make },
                { label: 'Model', value: l.model },
                { label: 'Year', value: String(l.year) },
                ...(l.engine_size ? [{ label: 'Engine Size', value: l.engine_size }] : []),
                ...(l.transmission ? [{ label: 'Transmission', value: l.transmission }] : []),
                ...(l.fuel_type ? [{ label: 'Fuel Type', value: l.fuel_type }] : []),
                ...(l.drive_type ? [{ label: 'Drive Type', value: l.drive_type.toUpperCase() }] : []),
                ...(l.color ? [{ label: 'Color', value: l.color }] : []),
                ...(l.condition !== 'brand_new' && l.previous_owners ? [{ label: 'Previous Owners', value: String(l.previous_owners) }] : []),
                ...(l.mileage != null && l.condition !== 'brand_new' ? [{ label: 'Mileage', value: formatMileage(l.mileage) }] : []),
                ...(l.vin ? [{ label: 'VIN', value: `${l.vin.slice(0, 3)}****${l.vin.slice(-3)}` }] : []),
              ].map(({ label, value }, i, arr) => (
                <div key={label} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Documents</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl border px-4 py-3 ${l.roadworthy ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                <p className="text-xs text-gray-500 mb-1">Roadworthy</p>
                <p className={`flex items-center gap-1.5 text-sm font-semibold ${l.roadworthy ? 'text-emerald-700' : 'text-gray-400'}`}>
                  {l.roadworthy
                    ? <><CheckCircle2 className="h-4 w-4" /> Valid{l.roadworthy_expiry ? ` until ${new Date(l.roadworthy_expiry).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}` : ''}</>
                    : <><XCircle className="h-4 w-4" /> Not provided</>
                  }
                </p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${l.customs_cleared ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                <p className="text-xs text-gray-500 mb-1">Customs Cleared</p>
                <p className={`flex items-center gap-1.5 text-sm font-semibold ${l.customs_cleared ? 'text-emerald-700' : 'text-gray-400'}`}>
                  {l.customs_cleared ? <><CheckCircle2 className="h-4 w-4" /> Yes</> : <><XCircle className="h-4 w-4" /> No</>}
                </p>
              </div>
            </div>
          </div>

          {/* Seller */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Seller</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#1A1A2E] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {(l.profiles?.username ?? 'S').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{l.profiles?.username ?? 'Seller'}</p>
                {l.region && <p className="text-xs text-gray-500">{l.city ? `${l.city}, ` : ''}{l.region}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sticky panel */}
        <div className="md:col-span-1">
          <AutoDetailClient listing={l} auction={auction ?? null} />
        </div>
      </div>
    </div>
  )
}
