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
    <>
      <h2 className="mt-6 font-bold">Bids</h2>

      {bids.length === 0 ? (
        <p className="text-sm text-gray-500">No bids yet</p>
      ) : (
        <ul className="mt-2 space-y-2">
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
                className={`border p-3 rounded flex justify-between items-center ${
                  isTop
                    ? 'bg-yellow-50 border-yellow-400'
                    : ''
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
                    <div className="text-sm text-gray-600">
                      {isYou ? 'You' : `@${username}`}
                    </div>
                    <div className="font-semibold">
                      GHS {bid.amount}
                    </div>
                  </div>
                </div>

                {isTop && <span>🏆</span>}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
