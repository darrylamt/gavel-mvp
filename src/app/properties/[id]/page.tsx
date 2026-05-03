import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Phone, ChevronLeft, Home, BadgeCheck } from 'lucide-react'
import type { Metadata } from 'next'
import type { PropertyListingWithAuction } from '@/types/properties'
import { formatGhsPrice, PROPERTY_TYPE_LABELS, TITLE_TYPE_LABELS, getPropertyCommission } from '@/lib/propertyUtils'
import PropertyDetailClient from './PropertyDetailClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data } = await supabase
    .from('property_listings')
    .select('title, city, region, price, property_type, listing_type')
    .eq('id', params.id)
    .single()

  if (!data) return { title: 'Property | Gavel Properties' }

  const priceStr = data.price ? ` — ${formatGhsPrice(data.price)}` : ''
  const typeStr = PROPERTY_TYPE_LABELS[data.property_type] ?? data.property_type

  if (data.listing_type === 'auction') {
    return {
      title: `${data.title} in ${data.city}, ${data.region} | Gavel Properties`,
      description: `${typeStr} auction in ${data.city}, ${data.region}${priceStr}`,
    }
  }

  return {
    title: `${data.title} in ${data.city}, ${data.region} | Gavel Properties`,
    description: `${typeStr} for sale in ${data.city}, ${data.region}${priceStr}`,
  }
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { data: listing } = await supabase
    .from('property_listings')
    .select('*, property_auctions(*), profiles(username, avatar_url)')
    .eq('id', params.id)
    .single()

  if (!listing || listing.status === 'archived') notFound()

  const l = listing as PropertyListingWithAuction & { profiles: { username: string | null; avatar_url: string | null } | null }
  const auction = l.property_auctions?.[0]
  const isAuction = l.listing_type === 'auction'
  const images = l.images ?? []
  const commission = l.price ? getPropertyCommission(l.price) : 0.05

  const sizeStr = [
    l.size_plots ? `${l.size_plots} plots` : null,
    l.size_sqft ? `${l.size_sqft.toLocaleString()} sq ft` : null,
    l.size_sqm ? `${l.size_sqm.toLocaleString()} sq m` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
      {/* Back */}
      <Link href="/properties/browse" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="h-4 w-4" />
        Back to listings
      </Link>

      {/* Image gallery */}
      {images.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-2xl overflow-hidden mb-8 max-h-[480px]">
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
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-[#0F2557] to-[#1a3570] h-48 flex items-center justify-center mb-8">
          <Home className="h-16 w-16 text-white/20" strokeWidth={1} />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left: Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Title & badges */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="rounded-full bg-[#0F2557]/10 text-[#0F2557] text-xs font-bold px-3 py-1">
                {PROPERTY_TYPE_LABELS[l.property_type] ?? l.property_type}
              </span>
              {isAuction && (
                <span className="rounded-full bg-[#C9A84C] text-white text-xs font-bold px-3 py-1">Live Auction</span>
              )}
              {l.is_licensed_auctioneer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1"><BadgeCheck className="h-3.5 w-3.5" /> Licensed Auctioneer</span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{l.title}</h1>
            <div className="flex items-center gap-1.5 text-gray-500">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{l.neighborhood ? `${l.neighborhood}, ` : ''}{l.city}, {l.region}</span>
            </div>
          </div>

          {/* Size */}
          {sizeStr && (
            <div className="rounded-xl bg-[#0F2557]/5 border border-[#0F2557]/10 px-4 py-3">
              <p className="text-sm text-gray-500 mb-0.5">Size</p>
              <p className="font-bold text-[#0F2557]">{sizeStr}</p>
              {l.actual_dimensions && <p className="text-xs text-gray-400 mt-0.5">Dimensions: {l.actual_dimensions}</p>}
            </div>
          )}

          {/* Description */}
          {l.description && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-2">About this property</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{l.description}</p>
            </div>
          )}

          {/* Details grid */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Property Details</h2>
            <div className="grid grid-cols-2 gap-3">
              {l.title_type && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Title Type</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">{TITLE_TYPE_LABELS[l.title_type] ?? l.title_type}</p>
                </div>
              )}
              {l.land_commission_number && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Commission No.</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">{l.land_commission_number}</p>
                </div>
              )}
              {l.bedrooms != null && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Bedrooms</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">{l.bedrooms}</p>
                </div>
              )}
              {l.bathrooms != null && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Bathrooms</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">{l.bathrooms}</p>
                </div>
              )}
              {l.furnished && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Furnished</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5 capitalize">{l.furnished.replace('_', ' ')}</p>
                </div>
              )}
              {l.gps_coordinates && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">GPS Coordinates</p>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(l.gps_coordinates)}`} target="_blank" rel="noopener noreferrer"
                    className="font-semibold text-[#0F2557] text-sm mt-0.5 hover:underline block">{l.gps_coordinates}</a>
                </div>
              )}
            </div>
          </div>

          {/* Amenities */}
          {l.amenities && l.amenities.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {l.amenities.map((a) => (
                  <span key={a} className="rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#0F2557] text-xs font-medium px-3 py-1">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Google Maps embed */}
          {l.gps_coordinates && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Location</h2>
              <div className="rounded-2xl overflow-hidden h-48 border border-gray-200">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(l.gps_coordinates)}&output=embed`}
                  width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                  title="Property location"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Sticky panel */}
        <div className="md:col-span-1">
          <PropertyDetailClient listing={l} auction={auction ?? null} />
        </div>
      </div>
    </div>
  )
}
