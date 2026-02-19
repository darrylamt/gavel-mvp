'use client'

import { useEffect, useMemo, useState } from 'react'

type WinnerPanelProps = {
  hasEnded: boolean
  isWinner: boolean
  paid: boolean
  paymentDueAt?: string | null
  onPay: () => void
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours}h ${minutes}m ${seconds}s`
}

export default function WinnerPanel({
  hasEnded,
  isWinner,
  paid,
  paymentDueAt,
  onPay,
}: WinnerPanelProps) {
  const dueAtMs = useMemo(() => {
    if (!paymentDueAt) return null
    const timestamp = new Date(paymentDueAt).getTime()
    return Number.isFinite(timestamp) ? timestamp : null
  }, [paymentDueAt])

  const [remainingMs, setRemainingMs] = useState(() => {
    if (!dueAtMs) return 0
    return Math.max(0, dueAtMs - Date.now())
  })

  useEffect(() => {
    if (!dueAtMs) {
      setRemainingMs(0)
      return
    }

    const tick = () => {
      setRemainingMs(Math.max(0, dueAtMs - Date.now()))
    }

    tick()
    const interval = setInterval(tick, 1000)

    return () => clearInterval(interval)
  }, [dueAtMs])

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
      <div className="bg-green-500 px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/90">Winning Bid</p>
      </div>

      <div className="p-4">
        <p className="text-lg font-bold text-amber-700">You won this auction</p>
        <p className="mt-1 text-sm text-gray-600">You have 1 hour to complete payment before the item is offered to the next eligible bidder.</p>
        {paymentDueAt && (
          <p className="mt-1 text-xs text-gray-500">Payment deadline: {new Date(paymentDueAt).toLocaleString()}</p>
        )}
        {dueAtMs != null && (
          <p className="mt-1 text-xs font-medium text-gray-700">
            Time remaining: {remainingMs > 0 ? formatRemaining(remainingMs) : 'Expired'}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">Bid tokens are non-refundable, even if payment is missed.</p>

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
