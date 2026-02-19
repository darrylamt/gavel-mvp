'use client'

import { useMemo, useState } from 'react'

type Bid = {
  id: string
  amount: number
  user_id: string
  masked_email?: string | null
  profiles?: {
    username: string | null
  }
}

type Props = {
  bids: Bid[]
  currentUserId: string | null
}

export default function BidList({ bids, currentUserId }: Props) {
  const [showAll, setShowAll] = useState(false)

  const visibleBids = useMemo(() => {
    return showAll ? bids : bids.slice(0, 5)
  }, [bids, showAll])

  return (
    <section className="mt-8">
      <h2 className="font-semibold mb-3">Bids</h2>

      {bids.length === 0 ? (
        <p className="text-sm text-gray-500">No bids yet</p>
      ) : (
        <>
          <ul className="space-y-3">
            {visibleBids.map((bid, index) => {
              const isTop = index === 0
              const isYou = bid.user_id === currentUserId
              const maskedBidderEmail = bid.masked_email

              const displayName = isYou
                ? 'You'
                : maskedBidderEmail ??
                  bid.profiles?.username ??
                  'Anonymous'

              return (
                <li
                  key={bid.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isTop
                      ? 'bg-yellow-50 border-yellow-400'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
                      {displayName[0]}
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Bid placed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      GHS {bid.amount}
                    </span>
                    {isTop && <span>🏆</span>}
                  </div>
                </li>
              )
            })}
          </ul>

          {bids.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="mt-3 text-sm font-medium text-black underline hover:text-gray-700"
            >
              {showAll ? 'Show less' : `Show more (${bids.length - 5} more)`}
            </button>
          )}
        </>
      )}
    </section>
  )
}
