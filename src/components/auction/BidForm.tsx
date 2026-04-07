'use client'

import { Gavel } from 'lucide-react'

type Props = {
  hasEnded: boolean
  bidAmount: string
  isPlacingBid: boolean
  error: string | null
  isLoggedIn: boolean
  currentPrice?: number
  minIncrement?: number | null
  maxIncrement?: number | null
  onBidAmountChange: (v: string) => void
  onSubmit: () => void
  compact?: boolean
}

export default function BidForm({
  hasEnded,
  bidAmount,
  isPlacingBid,
  error,
  isLoggedIn,
  currentPrice,
  minIncrement,
  maxIncrement,
  onBidAmountChange,
  onSubmit,
  compact = false,
}: Props) {
  if (hasEnded) return null

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center">
        <Gavel className="mx-auto h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm font-semibold text-gray-700">Sign in to bid</p>
        <p className="mt-1 text-xs text-gray-400">Create an account or log in to place a bid</p>
        <a
          href="/auth/login"
          className="mt-3 inline-block w-full rounded-xl bg-gray-900 py-2.5 text-center text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          Sign in
        </a>
      </div>
    )
  }

  // Build quick-increment buttons
  const min = typeof minIncrement === 'number' && minIncrement > 0 ? minIncrement : null
  const base = currentPrice ?? 0

  const quickAmounts: number[] = []
  if (min) {
    quickAmounts.push(base + min)
    quickAmounts.push(base + min * 2)
    quickAmounts.push(base + min * 5)
  } else {
    quickAmounts.push(base + 5, base + 10, base + 50)
  }

  const handleQuick = (amount: number) => {
    onBidAmountChange(String(amount))
  }

  const numBid = Number(bidAmount)
  const increment = numBid - base
  const belowMin = min != null && numBid > 0 && increment < min
  const aboveMax = maxIncrement != null && typeof maxIncrement === 'number' && maxIncrement > 0 && numBid > 0 && increment > maxIncrement

  if (compact) {
    // Slim version used in mobile bottom bar
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          placeholder={`Min GH₵ ${min ? base + min : base + 1}`}
          className="h-11 flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
          value={bidAmount}
          disabled={isPlacingBid}
          onChange={(e) => onBidAmountChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
        />
        <button
          onClick={onSubmit}
          disabled={isPlacingBid}
          className="h-11 flex-shrink-0 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors active:scale-95"
        >
          {isPlacingBid ? '…' : 'Bid'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Current price */}
      {typeof currentPrice === 'number' && (
        <div className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current price</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums">GH₵ {currentPrice.toLocaleString()}</span>
        </div>
      )}

      {/* Increment hint */}
      {min != null && (
        <p className="mb-3 text-xs text-gray-400">
          {maxIncrement != null && typeof maxIncrement === 'number' && maxIncrement > 0
            ? `Increment: +GH₵ ${min.toLocaleString()} – +GH₵ ${maxIncrement.toLocaleString()}`
            : `Minimum increment: +GH₵ ${min.toLocaleString()}`}
        </p>
      )}

      {/* Quick buttons */}
      <div className="flex gap-2 mb-3">
        {quickAmounts.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleQuick(amt)}
            disabled={isPlacingBid}
            className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
              Number(bidAmount) === amt
                ? 'border-orange-400 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50/50'
            }`}
          >
            GH₵ {amt.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Or enter amount
      </label>
      <input
        type="number"
        inputMode="numeric"
        placeholder={`e.g. GH₵ ${min ? base + min : base + 1}`}
        className={`h-12 w-full rounded-xl border px-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 ${
          belowMin || aboveMax
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-gray-200 focus:border-orange-400 focus:ring-orange-100'
        }`}
        value={bidAmount}
        disabled={isPlacingBid}
        onChange={(e) => onBidAmountChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
      />

      {error && (
        <p className="mt-2 text-sm font-medium text-red-500">{error}</p>
      )}

      <button
        onClick={onSubmit}
        disabled={isPlacingBid}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Gavel className="h-4 w-4" />
        {isPlacingBid ? 'Placing bid…' : 'Place Bid'}
      </button>

      <p className="mt-2.5 text-center text-xs text-gray-400">
        Each bid deducts tokens from your balance
      </p>
    </div>
  )
}
