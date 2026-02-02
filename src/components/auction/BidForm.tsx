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
      <p className="mt-4 text-sm text-gray-600">
        Please sign in to place a bid.
      </p>
    )
  }

  return (
    <div className="mt-4">
      <input
        type="number"
        placeholder="Your bid amount"
        className="border p-2 w-full mb-2"
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
        className={`px-4 py-2 w-full text-white ${
          isPlacingBid ? 'bg-gray-400' : 'bg-black'
        }`}
      >
        {isPlacingBid ? 'Placing bid…' : 'Place Bid'}
      </button>
    </div>
  )
}