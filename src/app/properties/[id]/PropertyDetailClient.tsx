'use client'

import { useEffect, useState } from 'react'
import { Phone, Share2, Copy, Check } from 'lucide-react'
import type { PropertyListing, PropertyAuction } from '@/types/properties'
import { formatGhsPrice } from '@/lib/propertyUtils'

type Props = {
  listing: PropertyListing & { profiles: { username: string | null; avatar_url: string | null } | null }
  auction: PropertyAuction | null
}

function Countdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Auction ended'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`)
      else setTimeLeft(`${h}h ${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endTime])

  return <>{timeLeft}</>
}

export default function PropertyDetailClient({ listing, auction }: Props) {
  const [bid, setBid] = useState('')
  const [copied, setCopied] = useState(false)
  const isAuction = listing.listing_type === 'auction'

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${listing.title} — Gavel Properties\n${typeof window !== 'undefined' ? window.location.href : ''}`)}`

  return (
    <div className="sticky top-24 space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        {/* Price */}
        {isAuction && auction ? (
          <>
            <p className="text-xs text-gray-500 mb-0.5">Current bid</p>
            <p className="text-3xl font-black text-[#0F2557] mb-1">
              {auction.current_bid ? formatGhsPrice(auction.current_bid) : formatGhsPrice(auction.reserve_price)}
            </p>
            <p className="text-sm text-gray-500 mb-1">
              {auction.bid_count} bid{auction.bid_count !== 1 ? 's' : ''}
            </p>
            {auction.end_time && (
              <p className="text-sm font-semibold text-[#C9A84C] mb-4">
                ⏱ <Countdown endTime={auction.end_time} />
              </p>
            )}

            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">Your bid (GHS)</label>
              <input
                type="number"
                value={bid}
                onChange={e => setBid(e.target.value)}
                placeholder={`Min: ${formatGhsPrice((auction.current_bid ?? auction.reserve_price) + 1000)}`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]"
              />
            </div>
            <button className="w-full rounded-xl bg-[#C9A84C] text-[#0F2557] font-bold py-3 text-sm hover:bg-[#d4b55c] transition-colors">
              Place Bid
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">You need tokens to place a bid</p>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-0.5">Asking price</p>
            <p className="text-3xl font-black text-[#0F2557] mb-4">
              {listing.price ? formatGhsPrice(listing.price) : 'Price on request'}
            </p>
            <button
              onClick={() => listing.contact_phone && window.open(`tel:${listing.contact_phone}`)}
              className="w-full rounded-xl bg-[#C9A84C] text-[#0F2557] font-bold py-3 text-sm hover:bg-[#d4b55c] transition-colors flex items-center justify-center gap-2 mb-2"
            >
              <Phone className="h-4 w-4" />
              Contact Seller
            </button>
            <button className="w-full rounded-xl border-2 border-[#0F2557] text-[#0F2557] font-bold py-3 text-sm hover:bg-[#0F2557]/5 transition-colors">
              Make Offer
            </button>
          </>
        )}
      </div>

      {/* Seller info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Seller</p>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-[#0F2557] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {(listing.profiles?.username ?? listing.contact_person ?? 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {listing.contact_person ?? listing.profiles?.username ?? 'Seller'}
            </p>
            {listing.is_licensed_auctioneer && (
              <p className="text-xs text-emerald-600 font-medium">✓ Licensed Auctioneer</p>
            )}
          </div>
        </div>
        {listing.contact_phone && (
          <a href={`tel:${listing.contact_phone}`} className="flex items-center gap-2 text-sm text-[#0F2557] font-medium hover:underline">
            <Phone className="h-3.5 w-3.5" />
            {listing.contact_phone}
          </a>
        )}
      </div>

      {/* Share */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Share</p>
        <div className="flex gap-2">
          <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2 text-sm font-semibold text-white hover:brightness-105 transition-all">
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
