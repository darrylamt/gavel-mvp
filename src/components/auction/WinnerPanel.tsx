'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trophy, CheckCircle2, Clock, AlertTriangle, CreditCard } from 'lucide-react'

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
  return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
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
    if (!dueAtMs) { setRemainingMs(0); return }
    const tick = () => setRemainingMs(Math.max(0, dueAtMs - Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [dueAtMs])

  if (!hasEnded || !isWinner) return null

  if (paid) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-md">
        <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-white" />
            <p className="text-sm font-bold uppercase tracking-widest text-white">Auction Won!</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-base font-bold text-emerald-700">Payment confirmed!</p>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              Your payment has been received successfully. The seller will begin fulfillment shortly. Check your orders for updates.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isExpired = dueAtMs != null && remainingMs === 0
  const isUrgent = dueAtMs != null && remainingMs > 0 && remainingMs < 15 * 60 * 1000 // < 15 min

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-md">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-white" />
          <p className="text-sm font-bold uppercase tracking-widest text-white">You Won!</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Congrats message */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl">
            🏆
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Congratulations!</p>
            <p className="text-sm text-gray-500 mt-0.5">
              You placed the winning bid. Complete payment to claim your item.
            </p>
          </div>
        </div>

        {/* Countdown */}
        {dueAtMs != null && !isExpired && (
          <div className={`flex items-center gap-3 rounded-xl p-3 ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-100'}`}>
            <Clock className={`h-4 w-4 flex-shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
                {isUrgent ? 'Hurry! Time running out' : 'Payment deadline'}
              </p>
              <p className={`text-lg font-bold font-mono ${isUrgent ? 'text-red-700' : 'text-amber-800'}`}>
                {formatRemaining(remainingMs)}
              </p>
              {paymentDueAt && (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Due by {new Date(paymentDueAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {isExpired && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-3">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              Payment window has expired. The item may be offered to the next bidder.
            </p>
          </div>
        )}

        {/* Note about tokens */}
        <p className="text-xs text-gray-400 leading-relaxed">
          Tokens used for winning bids are consumed and not refunded.
          You have 1 hour from auction end to complete payment.
        </p>

        {/* Pay button */}
        {!isExpired && (
          <button
            onClick={onPay}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white hover:bg-black transition-colors shadow-sm"
          >
            <CreditCard className="h-4 w-4" />
            Pay Now to Claim Your Item
          </button>
        )}
      </div>
    </div>
  )
}
