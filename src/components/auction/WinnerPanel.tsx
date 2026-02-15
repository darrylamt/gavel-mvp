type WinnerPanelProps = {
  hasEnded: boolean
  isWinner: boolean
  paid: boolean
  onPay: () => void
}

export default function WinnerPanel({
  hasEnded,
  isWinner,
  paid,
  onPay,
}: WinnerPanelProps) {
  if (!hasEnded || !isWinner) return null

  if (paid) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/90">Payment Status</p>
        </div>
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            ✓
          </div>
          <div>
            <p className="text-base font-semibold text-emerald-700">Payment received</p>
            <p className="mt-1 text-sm text-gray-600">
              Your payment has been confirmed successfully. The seller will continue fulfillment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/90">Winning Bid</p>
      </div>

      <div className="p-4">
        <p className="text-lg font-bold text-amber-700">🎉 You won this auction</p>
        <p className="mt-1 text-sm text-gray-600">Complete payment now to confirm your win and close this order.</p>

        <button
          onClick={onPay}
          className="mt-4 w-full rounded-lg bg-black px-4 py-2.5 font-semibold text-white hover:bg-gray-800"
        >
          Pay Now
        </button>
      </div>
    </div>
  )
}
