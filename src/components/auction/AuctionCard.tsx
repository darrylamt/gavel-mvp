"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Info } from 'lucide-react'
import { useStarredAuctions } from '@/hooks/useStarredAuctions'
import { buildAuctionPath } from '@/lib/seo'

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
  bidderCount?: number
  watcherCount?: number
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
  bidderCount,
  watcherCount,
}: AuctionCardProps) {
  const { isStarred, toggleStarred } = useStarredAuctions()
  const starred = isStarred(id)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const ticker = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(ticker)
  }, [])

  const timeLeftMs = new Date(endsAt).getTime() - nowMs
  const isEnded = timeLeftMs <= 0
  const startsAtMs = startsAt ? new Date(startsAt).getTime() : 0
  const isScheduled = !isEnded && startsAtMs > nowMs
  const canToggleStar = !isEnded || starred

  const [startCountdown, setStartCountdown] = useState<string | null>(null)
  const [openTip, setOpenTip] = useState<'min' | 'max' | null>(null)

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
      href={buildAuctionPath(id, title)}
      className="group block rounded-2xl border bg-white overflow-hidden hover:shadow-lg transition"
    >
      {/* IMAGE */}
      <div className="h-48 bg-gray-100 overflow-hidden relative">
        {!isEnded && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (!canToggleStar) return
              toggleStarred(id)
            }}
            aria-label={starred ? 'Remove from starred auctions' : 'Add to starred auctions'}
            title={canToggleStar ? (starred ? 'Remove from starred auctions' : 'Add to starred auctions') : 'Ended auctions cannot be starred'}
            disabled={!canToggleStar}
            className={`absolute left-2 top-2 z-10 rounded-full p-2 shadow-sm transition ${
              canToggleStar
                ? 'bg-white/90 text-gray-700 hover:bg-white'
                : 'bg-white/70 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Heart className={`h-4 w-4 ${starred ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
        )}

        {images && images.length > 0 ? (
          <img
            src={images[0]}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            decoding="async"
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

        {!isEnded && !isScheduled && typeof bidderCount === 'number' && (
          <div className="mt-3 text-xs font-medium text-blue-700">
            {bidderCount} bidder{bidderCount === 1 ? '' : 's'} participating
          </div>
        )}

        {!isEnded && isScheduled && typeof watcherCount === 'number' && (
          <div className="mt-3 text-xs font-medium text-purple-700">
            {watcherCount} watching
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          {minIncrement != null && (
            <div className="relative flex items-center gap-1">
              <span>Min +{minIncrement}</span>
              <button
                type="button"
                aria-label="Explain minimum increment"
                className="rounded p-0.5 text-gray-500 hover:bg-gray-100"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setOpenTip((prev) => (prev === 'min' ? null : 'min'))
                }}
                onMouseEnter={() => setOpenTip('min')}
                onMouseLeave={() => setOpenTip((prev) => (prev === 'min' ? null : prev))}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {openTip === 'min' && (
                <div className="absolute left-0 top-6 z-20 w-52 rounded-md border bg-white p-2 text-[11px] text-gray-700 shadow">
                  The next bid must be at least this amount above the current highest bid.
                </div>
              )}
            </div>
          )}
          {maxIncrement != null && (
            <div className="relative flex items-center gap-1">
              <span>Max +{maxIncrement}</span>
              <button
                type="button"
                aria-label="Explain maximum increment"
                className="rounded p-0.5 text-gray-500 hover:bg-gray-100"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setOpenTip((prev) => (prev === 'max' ? null : 'max'))
                }}
                onMouseEnter={() => setOpenTip('max')}
                onMouseLeave={() => setOpenTip((prev) => (prev === 'max' ? null : prev))}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {openTip === 'max' && (
                <div className="absolute left-0 top-6 z-20 w-52 rounded-md border bg-white p-2 text-[11px] text-gray-700 shadow">
                  The next bid cannot be more than this amount above the current highest bid.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
