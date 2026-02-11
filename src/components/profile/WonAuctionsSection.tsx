type WonAuction = {
  auction_id: string
  title: string
  amount: number
  paid: boolean
}

type Props = {
  auctions: WonAuction[]
  onPay: (auctionId: string, amount: number) => void
}

export default function WonAuctionsSection({
  auctions,
  onPay,
}: Props) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">
        Auctions Won
      </h2>

      {auctions.length === 0 ? (
        <p className="text-sm text-gray-500">
          You haven’t won any auctions yet.
        </p>
      ) : (
        <div className="space-y-4">
          {auctions.map((a) => (
            <div
              key={a.auction_id}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">
                  {a.title}
                </p>
                <p className="text-sm text-gray-600">
                  Winning bid: GHS {a.amount}
                </p>
              </div>

              {a.paid ? (
                <span className="text-green-600 font-semibold">
                  Paid
                </span>
              ) : (
                <button
                  onClick={() =>
                    onPay(a.auction_id, a.amount)
                  }
                  className="bg-black text-white px-4 py-2 rounded"
                >
                  Pay Now
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
