type Props = {
  hasEnded: boolean
  bidAmount: string
  isPlacingBid: boolean
  error: string | null
  isLoggedIn: boolean
  onBidAmountChange: (v: string) => void
  onSubmit: () => void
}

export default function BidForm({
  hasEnded,
  bidAmount,
  isPlacingBid,
  error,
  isLoggedIn,
  onBidAmountChange,
  onSubmit,
}: Props) {
  if (hasEnded) return null

  if (!isLoggedIn) {
    return (
      <div className="mt-6 p-4 border rounded-lg text-sm text-gray-600 bg-gray-50">
        Please sign in to place a bid.
      </div>
    )
  }

  return (
    <div className="mt-6 p-4 border rounded-xl bg-white shadow-sm">
      <label className="block text-sm font-medium mb-1">
        Your bid amount
      </label>

      <input
        type="number"
        placeholder="Enter amount in GHS"
        className="border rounded-lg p-3 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-black"
        value={bidAmount}
        disabled={isPlacingBid}
        onChange={(e) => onBidAmountChange(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 mb-2">
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={isPlacingBid}
        className={`mt-2 w-full rounded-lg py-3 font-semibold text-white transition ${
          isPlacingBid
            ? 'bg-gray-400'
            : 'bg-black hover:bg-gray-900'
        }`}
      >
        {isPlacingBid ? 'Placing bid…' : 'Place Bid'}
      </button>

      <p className="mt-2 text-xs text-gray-500 text-center">
        Each bid deducts tokens from your balance
      </p>
    </div>
  )
}
