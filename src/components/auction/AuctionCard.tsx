"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

type AuctionCardProps = {
  id: string
  title: string
  description?: string | null
  startingPrice?: number | null
  currentPrice: number
  endsAt: string
  startsAt?: string | null
  status?: string | null
  imageUrl?: string | null
  images?: string[] | null
  reservePrice?: number | null
  minIncrement?: number | null
  maxIncrement?: number | null
}

export default function AuctionCard({
  id,
  title,
  description,
  startingPrice,
  currentPrice,
  endsAt,
  startsAt,
  status,
  imageUrl,
  images,
  reservePrice,
  minIncrement,
  maxIncrement,
}: AuctionCardProps) {
  const timeLeftMs = new Date(endsAt).getTime() - Date.now()
  const isEnded = timeLeftMs <= 0
  const startsAtMs = startsAt ? new Date(startsAt).getTime() : 0
  const isScheduled = startsAtMs > Date.now()
  const isActive = (status === 'active' || (!status && !isScheduled)) && !isEnded

  const [startCountdown, setStartCountdown] = useState<string | null>(null)

  useEffect(() => {
    if (!startsAt || !isScheduled) return

    const update = () => {
      const diff = new Date(startsAt).getTime() - Date.now()
      if (diff <= 0) {
        setStartCountdown('Starting...')
        return
      }

      const s = Math.floor((diff / 1000) % 60)
      const m = Math.floor((diff / (1000 * 60)) % 60)
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const d = Math.floor(diff / (1000 * 60 * 60 * 24))

      const parts: string[] = []
      if (d) parts.push(`${d}d`)
      if (h) parts.push(`${h}h`)
      if (m) parts.push(`${m}m`)
      parts.push(`${s}s`)

      setStartCountdown(parts.join(' '))
    }

    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [startsAt, isScheduled])

  return (
    <Link
      href={`/auctions/${id}`}
      className="group block rounded-2xl border bg-white overflow-hidden hover:shadow-lg transition"
    >
      {/* IMAGE */}
      <div className="h-48 bg-gray-100 overflow-hidden relative">
        {images && images.length > 0 ? (
          <img
            src={images[0]}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}

        {images && images.length > 1 && (
          <div className="absolute right-2 top-2 bg-black text-white text-xs px-2 py-1 rounded">{images.length} images</div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-4">
        <h3 className="font-semibold text-lg leading-tight mb-2 group-hover:underline">
          {title}
        </h3>

        <p className="text-sm text-gray-500 mb-1">Current bid</p>

        <p className="text-2xl font-bold mb-1">GHS {currentPrice.toLocaleString()}</p>

        {startingPrice != null && (
          <p className="text-sm text-gray-500 mb-1">Starting: GHS {startingPrice.toLocaleString()}</p>
        )}

        <span
          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
            isEnded
              ? 'bg-red-100 text-red-700'
              : isScheduled
              ? 'bg-gray-100 text-gray-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {isEnded ? 'Ended' : isScheduled ? 'Scheduled' : 'Live'}
        </span>

        {isScheduled && startCountdown && (
          <span className="ml-3 text-xs text-gray-600">{startCountdown}</span>
        )}

        <div className="mt-3 text-xs text-gray-500">
          {minIncrement != null && <span className="mr-3">Min +{minIncrement}</span>}
          {maxIncrement != null && <span>Max +{maxIncrement}</span>}
        </div>
      </div>
    </Link>
  )
}
