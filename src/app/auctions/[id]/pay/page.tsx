'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Trophy, Clock, CreditCard, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useTopToast } from '@/components/ui/TopToastProvider'
import { normalizeAuctionImageUrls } from '@/lib/auctionImages'
import { formatGhs } from '@/lib/formatGhs'

/**
 * Dedicated winner payment page (`/auctions/[id]/pay`).
 *
 * This is the deep-link target used by the "you won — pay now" SMS / in-app /
 * email notifications. It shows the item, the winning amount, and a live payment
 * deadline countdown, and starts a checkout via the active payment provider
 * (Paystack today, Hubtel when switched — `/api/paystack/init` resolves the
 * provider internally). On success the provider redirects to /payment/success,
 * which verifies the payment and flips `paid = true` (see /api/auction-payments/verify).
 */

type AuctionRecord = {
  id: string
  title: string
  current_price: number
  winning_bid_id: string | null
  auction_payment_due_at: string | null
  paid: boolean
  status: string | null
  image_url: string | null
  images: unknown[] | null
}

type BidRecord = { id: string; user_id: string; amount: number }

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
}

export default function AuctionPayPage() {
  const { notify } = useTopToast()
  const params = useParams<{ id?: string | string[] }>()

  const auctionId = useMemo(() => {
    const raw = params?.id
    const value = Array.isArray(raw) ? raw[0] : raw
    if (!value) return null
    const cleaned = decodeURIComponent(String(value)).trim().split(',')[0].split('/')[0].trim()
    return cleaned || null
  }, [params])

  const [auction, setAuction] = useState<AuctionRecord | null>(null)
  const [winningBid, setWinningBid] = useState<BidRecord | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const load = useCallback(async () => {
    if (!auctionId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/auctions/${encodeURIComponent(auctionId)}`, { cache: 'no-store' })
      if (res.ok) {
        const payload = (await res.json()) as { auction?: AuctionRecord }
        setAuction(payload.auction ?? null)
      }

      const bidsRes = await fetch(`/api/bids?auction_id=${encodeURIComponent(auctionId)}`, { cache: 'no-store' })
      if (bidsRes.ok) {
        const payload = (await bidsRes.json()) as { bids?: BidRecord[] }
        setWinningBid(payload.bids?.[0] ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => { load() }, [load])

  // Resolve the winning bid the auction points at (falls back to the top bid).
  const resolvedWinningBid = useMemo(() => {
    if (!auction) return null
    if (winningBid && auction.winning_bid_id && winningBid.id === auction.winning_bid_id) return winningBid
    return winningBid
  }, [auction, winningBid])

  const dueAtMs = useMemo(() => {
    if (!auction?.auction_payment_due_at) return null
    const ts = new Date(auction.auction_payment_due_at).getTime()
    return Number.isFinite(ts) ? ts : null
  }, [auction?.auction_payment_due_at])

  useEffect(() => {
    if (!dueAtMs) { setRemainingMs(null); return }
    const tick = () => setRemainingMs(Math.max(0, dueAtMs - Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [dueAtMs])

  const amountDue = Number(resolvedWinningBid?.amount ?? auction?.current_price ?? 0)
  const isWinner = !!resolvedWinningBid && !!userId && resolvedWinningBid.user_id === userId
  const isExpired = dueAtMs != null && remainingMs === 0
  const isUrgent = remainingMs != null && remainingMs > 0 && remainingMs < 15 * 60 * 1000

  const handlePay = async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user?.email) {
      notify({ title: 'Sign in required', description: 'Log in to complete payment', variant: 'warning' })
      return
    }
    setPaying(true)
    try {
      const res = await fetch('/api/paystack/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auction_id: auction!.id, user_id: auth.user.id, email: auth.user.email }),
      })
      const data = await res.json()
      if (!res.ok || !data.authorization_url) {
        notify({ title: 'Payment failed', description: data.error || 'Unable to start payment', variant: 'error' })
        return
      }
      window.location.href = data.authorization_url
    } catch {
      notify({ title: 'Payment error', description: 'Something went wrong. Please try again.', variant: 'error' })
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-7 w-7 rounded-full border-2 border-gray-200 border-t-orange-500 animate-spin" />
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-lg font-bold text-gray-900">Auction not found</p>
        <Link href="/auctions" className="mt-4 inline-block rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white">
          Browse auctions
        </Link>
      </div>
    )
  }

  const images = normalizeAuctionImageUrls(auction.images, auction.image_url)

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link href={`/auctions/${auction.id}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to auction
      </Link>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
          <Trophy className="h-5 w-5 text-white" />
          <p className="text-sm font-bold uppercase tracking-widest text-white">Complete your payment</p>
        </div>

        <div className="p-5 space-y-5">
          {/* Item */}
          <div className="flex items-center gap-4">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0]} alt={auction.title} className="h-20 w-20 flex-shrink-0 rounded-xl border border-gray-100 object-cover" />
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">🏷️</div>
            )}
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900">{auction.title}</p>
              <p className="mt-0.5 text-xs text-gray-400">Lot {auction.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">Amount due</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">{formatGhs(amountDue)}</p>
          </div>

          {auction.paid ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-700">Payment already received</p>
                <p className="mt-0.5 text-xs text-gray-500">The seller will prepare your item for dispatch. Check your orders for updates.</p>
              </div>
            </div>
          ) : !isWinner ? (
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500" />
              <div>
                <p className="text-sm font-bold text-gray-700">This payment isn&apos;t available to you</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {userId ? 'You are not the winning bidder for this auction.' : 'Log in with the account that placed the winning bid.'}
                </p>
              </div>
            </div>
          ) : isExpired ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-bold text-red-700">Payment window has expired</p>
                <p className="mt-0.5 text-xs text-gray-500">Contact support if you believe this is a mistake.</p>
              </div>
            </div>
          ) : (
            <>
              {dueAtMs != null && (
                <div className={`flex items-center gap-3 rounded-xl p-3 ${isUrgent ? 'border border-red-200 bg-red-50' : 'border border-amber-100 bg-amber-50'}`}>
                  <Clock className={`h-4 w-4 flex-shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
                      {isUrgent ? 'Hurry! Time running out' : 'Payment deadline'}
                    </p>
                    <p className={`font-mono text-lg font-bold ${isUrgent ? 'text-red-700' : 'text-amber-800'}`}>
                      {remainingMs != null ? formatRemaining(remainingMs) : '—'}
                    </p>
                    {auction.auction_payment_due_at && (
                      <p className="mt-0.5 text-[11px] text-gray-400">Due by {new Date(auction.auction_payment_due_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={paying}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white hover:bg-black transition-colors disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                {paying ? 'Starting payment…' : `Pay ${formatGhs(amountDue)} now`}
              </button>
              <p className="text-center text-[11px] text-gray-400">
                Secure payment. Tokens used for winning bids are consumed and not refunded.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
