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
}

export default function BidList({ bids }: Props) {
  return (
    <>
      <h2 className="mt-6 font-bold">Bids</h2>

      {bids.length === 0 ? (
        <p className="text-sm text-gray-500">No bids yet</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {bids.map((bid, index) => {
            const isTop = index === 0
            const username =
              bid.profiles?.username ?? 'Anonymous'

            return (
              <li
                key={bid.id}
                className={`border p-2 rounded flex justify-between items-center ${
                  isTop
                    ? 'bg-yellow-50 border-yellow-400 font-semibold'
                    : ''
                }`}
              >
                <div>
                  <div className="text-sm text-gray-600">
                    @{username}
                  </div>
                  <div>GHS {bid.amount}</div>
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
