'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { formatBidTime } from '@/lib/formatBidTime'

type Bid = {
  id: string
  amount: number
  user_id: string
  created_at?: string
  masked_email?: string | null
  profiles?: {
    username: string | null
  }
}

type Props = {
  bids: Bid[]
  currentUserId: string | null
}

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
]

function avatarColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export default function BidList({ bids, currentUserId }: Props) {
  const [showAll, setShowAll] = useState(false)
  const [slamId, setSlamId] = useState<string | null>(null)
  const [prevAmountId, setPrevAmountId] = useState<string | null>(null)
  const prevTopRef = useRef<string | null>(null)
  const isMountedRef = useRef(false)

  // Detect when a new top bid arrives from the current user → slam animation
  // Skip on first mount (don't animate existing bids on page load)
  useEffect(() => {
    const topBid = bids[0]

    if (!isMountedRef.current) {
      isMountedRef.current = true
      prevTopRef.current = topBid?.id ?? null
      return
    }

    if (!topBid) return

    const isNewTop = topBid.id !== prevTopRef.current
    const isCurrentUser = topBid.user_id === currentUserId

    prevTopRef.current = topBid.id

    if (isNewTop && isCurrentUser) {
      setSlamId(topBid.id)
      setPrevAmountId(topBid.id)
      const t1 = setTimeout(() => setSlamId(null), 700)
      const t2 = setTimeout(() => setPrevAmountId(null), 500)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [bids, currentUserId])

  const visibleBids = useMemo(() => (showAll ? bids : bids.slice(0, 8)), [bids, showAll])

  if (bids.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Bid History</h2>
        <div className="flex flex-col items-center py-8 text-gray-400">
          <Trophy className="h-10 w-10 mb-2 opacity-30" />
          <p className="text-sm">No bids yet — be the first!</p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Bid History</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
          {bids.length} bid{bids.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ul className="space-y-2">
        {visibleBids.map((bid, index) => {
          const isTop = index === 0
          const isYou = bid.user_id === currentUserId
          const displayName = isYou
            ? 'You'
            : bid.masked_email ?? bid.profiles?.username ?? 'Bidder'

          const initial = (displayName[0] ?? '?').toUpperCase()
          const color = isYou ? 'bg-orange-500' : avatarColor(bid.user_id)
          const isSlam = slamId === bid.id
          const isFlipAmount = prevAmountId === bid.id

          return (
            <li
              key={bid.id}
              style={isSlam ? { animation: 'bidSlam 0.62s cubic-bezier(0.34,1.56,0.64,1) both' } : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors ${
                isTop
                  ? isYou
                    ? 'bg-orange-50 border border-orange-200 ring-1 ring-orange-100'
                    : 'bg-amber-50 border border-amber-200'
                  : isYou
                  ? 'bg-orange-50/40 border border-orange-100/60'
                  : 'border border-gray-100 bg-gray-50/50'
              }`}
            >
              {/* Avatar */}
              <div className={`relative h-9 w-9 flex-shrink-0 rounded-full ${color} flex items-center justify-center text-sm font-bold text-white`}>
                {initial}
                {isTop && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px]">
                    👑
                  </span>
                )}
              </div>

              {/* Name + time */}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${isYou ? 'text-orange-700' : 'text-gray-800'}`}>
                  {displayName}
                  {isTop && <span className="ml-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wide">Leading</span>}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {bid.created_at ? formatBidTime(bid.created_at) : 'Just now'}
                </p>
              </div>

              {/* Amount */}
              <div className={`text-right flex-shrink-0 ${isTop ? 'text-base' : 'text-sm'}`}>
                <span
                  style={isFlipAmount ? { animation: 'priceFlip 0.35s ease-out both', display: 'inline-block', transformOrigin: 'top center' } : undefined}
                  className={`font-bold tabular-nums ${isTop ? 'text-gray-900' : 'text-gray-700'}`}
                >
                  GH₵ {Number(bid.amount).toLocaleString()}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {bids.length > 8 && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {showAll ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Show {bids.length - 8} more bids</>
          )}
        </button>
      )}
    </section>
  )
}
