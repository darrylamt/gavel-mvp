type Bid = {
  id: string
  amount: number
  user_id: string
  profiles?: {
    username: string | null
  }
}

type Props = {
  bids: Bid[]
  currentUserId: string | null
}

export default function BidList({
  bids,
  currentUserId,
}: Props) {
  return (
    <section className="mt-8">
      <h2 className="font-semibold mb-3">Bids</h2>

      {bids.length === 0 ? (
        <p className="text-sm text-gray-500">
          No bids yet
        </p>
      ) : (
        <ul className="space-y-3">
          {bids.map((bid, index) => {
            const isTop = index === 0
            const isYou =
              currentUserId &&
              bid.user_id === currentUserId

            const username =
              bid.profiles?.username ?? 'Anonymous'

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
                    {isYou
                      ? 'Y'
                      : username[0].toUpperCase()}
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {isYou ? 'You' : username}
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
      )}
    </section>
  )
}
