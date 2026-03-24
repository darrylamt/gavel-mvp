type Props = {
  hasEnded: boolean
  bidAmount: string
  isPlacingBid: boolean
  error: string | null
  isLoggedIn: boolean
  minIncrement?: number | null
  maxIncrement?: number | null
  onBidAmountChange: (v: string) => void
  onSubmit: () => void
}

export default function BidForm({
  hasEnded,
  bidAmount,
  isPlacingBid,
  error,
  isLoggedIn,
  minIncrement,
  maxIncrement,
  onBidAmountChange,
  onSubmit,
}: Props) {
  if (hasEnded) return null

  if (!isLoggedIn) {
    return (
      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Please sign in to place a bid.
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <label className="mb-1.5 block text-sm font-semibold text-gray-800">
        Your bid amount
      </label>

      <input
        type="number"
        placeholder="Enter amount in GHS"
        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
        value={bidAmount}
        disabled={isPlacingBid}
        onChange={(e) => onBidAmountChange(e.target.value)}
      />

      {error && (
        <p className="mt-2 text-sm font-medium text-red-500">{error}</p>
      )}

      <button
        onClick={onSubmit}
        disabled={isPlacingBid}
        className="mt-3 w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPlacingBid ? 'Placing bid…' : 'Place Bid'}
      </button>

      <p className="mt-2.5 text-center text-xs text-gray-400">
        Each bid deducts tokens from your balance
      </p>

      {typeof minIncrement === 'number' && minIncrement > 0 && (
        <p className="mt-1 text-center text-xs text-gray-400">
          {typeof maxIncrement === 'number' && maxIncrement > 0
            ? `Allowed increment: +GH₵ ${minIncrement.toLocaleString()} – +GH₵ ${maxIncrement.toLocaleString()}`
            : `Minimum increment: +GH₵ ${minIncrement.toLocaleString()}`}
        </p>
      )}
    </div>
  )
}
