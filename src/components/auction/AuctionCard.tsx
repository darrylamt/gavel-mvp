"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Heart, Info, Lock } from 'lucide-react'
import { useStarredAuctions } from '@/hooks/useStarredAuctions'
import { getOrCreateViewerKey } from '@/lib/engagement'
import { buildAuctionPath } from '@/lib/seo'
import { getSessionHeaders } from '@/lib/supabaseClient'
import { normalizeAuctionImageUrls } from '@/lib/auctionImages'
import { useSharedTick } from './SharedTickProvider'

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
  images?: unknown[] | null
  reservePrice?: number | null
  minIncrement?: number | null
  maxIncrement?: number | null
  bidderCount?: number
  watcherCount?: number
  compactMobile?: boolean
  isPrivate?: boolean
}

export default function AuctionCard({
  id,
  title,
  startingPrice,
  currentPrice,
  endsAt,
  startsAt,
  imageUrl,
  images,
  reservePrice,
  minIncrement,
  maxIncrement,
  bidderCount,
  watcherCount,
  compactMobile = false,
  isPrivate = false,
}: AuctionCardProps) {
  const { isStarred, toggleStarred } = useStarredAuctions()
  const starred = isStarred(id)
  const { nowMs } = useSharedTick()
  const galleryImages = normalizeAuctionImageUrls(images, imageUrl)
  const primaryImage = galleryImages[0] ?? null

  const timeLeftMs = new Date(endsAt).getTime() - nowMs
  const isEnded = timeLeftMs <= 0
  const startsAtMs = startsAt ? new Date(startsAt).getTime() : 0
  const isScheduled = !isEnded && startsAtMs > nowMs
  const isLive = !isEnded && !isScheduled
  const canToggleStar = !isEnded || starred

  const [openTip, setOpenTip] = useState<'min' | 'max' | null>(null)

  const startCountdown = useMemo(() => {
    if (!startsAt || !isScheduled) return null
    const diff = new Date(startsAt).getTime() - nowMs
    if (diff <= 0) return 'Starting...'
    const s = Math.floor((diff / 1000) % 60)
    const m = Math.floor((diff / (1000 * 60)) % 60)
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const d = Math.floor(diff / (1000 * 60 * 60 * 24))
    const parts: string[] = []
    if (d) parts.push(`${d}d`)
    if (h) parts.push(`${h}h`)
    if (m) parts.push(`${m}m`)
    parts.push(`${s}s`)
    return parts.join(' ')
  }, [startsAt, isScheduled, nowMs])

  const endCountdown = useMemo(() => {
    if (isEnded || isScheduled) return null
    const diff = new Date(endsAt).getTime() - nowMs
    if (diff <= 0) return 'Ended'
    const s = Math.floor((diff / 1000) % 60)
    const m = Math.floor((diff / (1000 * 60)) % 60)
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const d = Math.floor(diff / (1000 * 60 * 60 * 24))
    const parts: string[] = []
    if (d) parts.push(`${d}d`)
    if (h) parts.push(`${h}h`)
    if (m) parts.push(`${m}m`)
    parts.push(`${s}s`)
    return parts.join(' ')
  }, [endsAt, isEnded, isScheduled, nowMs])

  const trackCardView = () => {
    const viewerKey = getOrCreateViewerKey()
    if (!viewerKey) return
    const body = JSON.stringify({ auction_id: id, viewer_key: viewerKey, action: 'view' })
    void getSessionHeaders().then((headers) => {
      headers['Content-Type'] = 'application/json'
      return fetch('/api/auctions/engagement', { method: 'POST', headers, body, keepalive: true })
    }).catch(() => {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/auctions/engagement', new Blob([body], { type: 'application/json' }))
      }
    })
  }

  return (
    <Link
      href={buildAuctionPath(id, title)}
      onClick={trackCardView}
      className="group block rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* ── Image ── */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
        {/* Status badge — top left */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${
              isEnded
                ? 'bg-red-600 text-white shadow-sm'
                : isScheduled
                ? 'bg-white/90 text-gray-700 backdrop-blur-sm shadow-sm'
                : 'bg-green-500 text-white shadow-sm'
            }`}
          >
            {isLive && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
            {isEnded ? 'Ended' : isScheduled ? 'Scheduled' : 'Live'}
          </span>
          {isPrivate && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-500/90 px-2 py-0.5 text-[10px] font-bold text-white leading-none backdrop-blur-sm">
              <Lock className="h-2.5 w-2.5" />
              Private
            </span>
          )}
          {reservePrice != null && (
            <span className="inline-flex rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold text-white leading-none backdrop-blur-sm">
              Reserve
            </span>
          )}
        </div>

        {/* Heart — top right */}
        {!isEnded && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (canToggleStar) toggleStarred(id) }}
            aria-label={starred ? 'Remove from starred' : 'Add to starred'}
            disabled={!canToggleStar}
            className={`absolute right-2 top-2 z-10 rounded-full p-1.5 shadow-sm transition-all ${
              canToggleStar ? 'bg-white/90 hover:bg-white hover:scale-110' : 'bg-white/60 cursor-not-allowed'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${starred ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
          </button>
        )}

        {/* Image */}
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
        )}

        {/* Image count — bottom right */}
        {galleryImages.length > 1 && (
          <span className="absolute right-2 bottom-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {galleryImages.length} imgs
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="p-3 sm:p-4">
        <h3 className={`font-semibold leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors ${compactMobile ? 'text-xs sm:text-sm' : 'text-sm'}`}>
          {title}
        </h3>

        {/* Price */}
        <p className={`font-bold text-gray-900 mt-1.5 ${compactMobile ? 'text-sm sm:text-lg' : 'text-lg'}`}>
          GHS {currentPrice.toLocaleString()}
        </p>

        {startingPrice != null && (
          <p className={`text-gray-400 ${compactMobile ? 'hidden sm:block text-xs' : 'text-xs'}`}>
            Starting: GHS {startingPrice.toLocaleString()}
          </p>
        )}

        {/* Countdown */}
        {isLive && endCountdown && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-orange-50 border border-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
            ⏳ {endCountdown}
          </div>
        )}
        {isScheduled && startCountdown && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">
            ⏰ Starts in {startCountdown}
          </div>
        )}

        {/* Bidder/watcher counts — hidden on compact mobile */}
        {!isEnded && (
          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 ${compactMobile ? 'hidden sm:flex' : 'flex'}`}>
            {typeof bidderCount === 'number' && isLive && (
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{bidderCount}</span> bidder{bidderCount === 1 ? '' : 's'}
              </span>
            )}
            {typeof watcherCount === 'number' && (
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{watcherCount}</span> watching
              </span>
            )}
          </div>
        )}

        {/* Increment info — desktop only */}
        {(minIncrement != null || maxIncrement != null) && (
          <div className={`flex flex-wrap gap-3 text-xs text-gray-400 mt-2 ${compactMobile ? 'hidden sm:flex' : 'flex'}`}>
            {minIncrement != null && (
              <div className="relative flex items-center gap-1">
                <span>Min +{minIncrement}</span>
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-gray-100"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenTip((p) => (p === 'min' ? null : 'min')) }}
                  onMouseEnter={() => setOpenTip('min')}
                  onMouseLeave={() => setOpenTip((p) => (p === 'min' ? null : p))}
                >
                  <Info className="h-3 w-3" />
                </button>
                {openTip === 'min' && (
                  <div className="absolute left-0 top-5 z-20 w-52 rounded-lg border bg-white p-2 text-[11px] text-gray-600 shadow-lg">
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
                  className="rounded p-0.5 hover:bg-gray-100"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenTip((p) => (p === 'max' ? null : 'max')) }}
                  onMouseEnter={() => setOpenTip('max')}
                  onMouseLeave={() => setOpenTip((p) => (p === 'max' ? null : p))}
                >
                  <Info className="h-3 w-3" />
                </button>
                {openTip === 'max' && (
                  <div className="absolute left-0 top-5 z-20 w-52 rounded-lg border bg-white p-2 text-[11px] text-gray-600 shadow-lg">
                    The next bid cannot be more than this amount above the current highest bid.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
