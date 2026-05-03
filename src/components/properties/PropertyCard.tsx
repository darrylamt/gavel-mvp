'use client'

import Link from 'next/link'
import { MapPin, Home, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PropertyListing, PropertyAuction } from '@/types/properties'
import { formatGhsPrice, PROPERTY_TYPE_LABELS } from '@/lib/propertyUtils'

type Props = {
  listing: PropertyListing & { property_auctions?: PropertyAuction[] | null }
}

function Countdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h > 24) setTimeLeft(`${Math.floor(h / 24)}d ${h % 24}h`)
      else setTimeLeft(`${h}h ${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endTime])

  return <span>{timeLeft}</span>
}

export default function PropertyCard({ listing }: Props) {
  const auction = listing.property_auctions?.[0]
  const isAuction = listing.listing_type === 'auction'
  const image = listing.images?.[0]

  const sizeStr = listing.size_plots
    ? `${listing.size_plots} plot${listing.size_plots !== 1 ? 's' : ''}`
    : listing.size_sqm
    ? `${listing.size_sqm} sqm`
    : null

  return (
    <Link href={`/properties/${listing.id}`} className="group block rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {image ? (
          <img src={image} alt={listing.title} className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#0F2557] to-[#1a3570]">
            <Home className="h-12 w-12 text-white/30" strokeWidth={1} />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-[#0F2557]">
            {PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          {isAuction
            ? <span className="rounded-full bg-[#C9A84C] px-2.5 py-0.5 text-[11px] font-bold text-white">Live Auction</span>
            : <span className="rounded-full bg-[#0F2557] px-2.5 py-0.5 text-[11px] font-bold text-white">For Sale</span>
          }
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <p className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug mb-1.5">{listing.title}</p>
        <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{listing.city}, {listing.region}</span>
        </div>
        {sizeStr && <p className="text-xs text-gray-400 mb-2">{sizeStr}</p>}

        {isAuction && auction ? (
          <div>
            <p className="text-xs text-gray-500">Current bid</p>
            <p className="text-base font-bold text-[#0F2557]">
              {auction.current_bid ? formatGhsPrice(auction.current_bid) : formatGhsPrice(auction.reserve_price)}
            </p>
            <p className="flex items-center gap-1 text-xs text-[#C9A84C] font-medium mt-0.5">
              <Clock className="h-3 w-3" /> <Countdown endTime={auction.end_time} />
            </p>
          </div>
        ) : (
          <p className="text-base font-bold text-[#0F2557]">
            {listing.price ? formatGhsPrice(listing.price) : 'Price on request'}
          </p>
        )}
      </div>
    </Link>
  )
}
