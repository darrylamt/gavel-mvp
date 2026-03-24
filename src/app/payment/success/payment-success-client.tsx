'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle2, ShoppingBag, Gavel, Package, ArrowRight, Loader2 } from 'lucide-react'

export default function PaymentSuccessClient() {
  const params = useSearchParams()
  const router = useRouter()
  const reference = params.get('reference')
  const paymentType = params.get('type')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    reference ? 'loading' : 'error'
  )
  const [errorMessage, setErrorMessage] = useState('Payment verification failed')

  useEffect(() => {
    if (!reference) return

    const postVerify = async (endpoint: string) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })
      const json = await res.json().catch(() => ({}))
      return { ok: res.ok, error: typeof json?.error === 'string' ? json.error : null }
    }

    const verifyPayment = async () => {
      let resolvedType: 'shop' | 'auction' | null = null
      let lastError = 'Payment verification failed'

      if (paymentType === 'shop') {
        const result = await postVerify('/api/shop-payments/verify')
        if (result.ok) resolvedType = 'shop'
        else lastError = result.error ?? lastError
      } else if (paymentType === 'auction') {
        const result = await postVerify('/api/auction-payments/verify')
        if (result.ok) resolvedType = 'auction'
        else lastError = result.error ?? lastError
      } else {
        const shopResult = await postVerify('/api/shop-payments/verify')
        if (shopResult.ok) {
          resolvedType = 'shop'
        } else {
          const auctionResult = await postVerify('/api/auction-payments/verify')
          if (auctionResult.ok) {
            resolvedType = 'auction'
          } else {
            lastError = auctionResult.error ?? shopResult.error ?? lastError
          }
        }
      }

      if (resolvedType) {
        await supabase.auth.refreshSession()
        if (resolvedType === 'shop' && typeof window !== 'undefined') {
          window.localStorage.setItem('gavel:cart-items', JSON.stringify([]))
          window.dispatchEvent(new CustomEvent('gavel:cart-items-changed'))
        }
        setStatus('success')
      } else {
        setErrorMessage(lastError)
        setStatus('error')
      }
    }

    verifyPayment()
  }, [reference, paymentType])

  const isShop = paymentType === 'shop'

  if (status === 'loading') {
    return (
      <main className="flex min-h-[80vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-orange-100" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
              <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500">Confirming your payment…</p>
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-[80vh] items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <span className="text-2xl font-bold text-red-500">✕</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Payment not confirmed</h1>
          <p className="mt-2 text-sm text-gray-500">{errorMessage}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Success card */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl border border-gray-100">
          {/* Top accent */}
          <div className="h-2 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />

          <div className="px-8 py-10 text-center">
            {/* Animated checkmark */}
            <div className="relative mx-auto mb-7 h-24 w-24">
              <div className="absolute inset-0 rounded-full bg-green-100/60" />
              <div className="absolute inset-2 rounded-full bg-green-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle2 className="h-14 w-14 text-green-500" strokeWidth={1.5} />
              </div>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Payment successful!
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {isShop
                ? 'Your order has been placed and is awaiting dispatch.'
                : 'Your auction payment has been confirmed. The seller has been notified.'}
            </p>

            {/* Info row */}
            <div className="mt-7 grid grid-cols-3 divide-x divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50">
              {(isShop
                ? [
                    { Icon: Package, label: 'Order placed' },
                    { Icon: ShoppingBag, label: 'Seller notified' },
                    { Icon: CheckCircle2, label: 'Confirmed' },
                  ]
                : [
                    { Icon: Gavel, label: 'Auction won' },
                    { Icon: Package, label: 'In escrow' },
                    { Icon: CheckCircle2, label: 'Confirmed' },
                  ]
              ).map(({ Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50">
                    <Icon className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">{label}</span>
                </div>
              ))}
            </div>

            {/* What's next */}
            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-gray-400">
              What happens next
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {isShop
                ? 'Check your orders in your profile. The seller will dispatch your item via Dawurobo and you\'ll receive delivery updates.'
                : 'Your purchase is held securely in escrow. It releases to the seller once delivery is confirmed.'}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => router.push('/profile/orders')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600 transition-colors"
              >
                View My Orders <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push(isShop ? '/shops' : '/auctions')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isShop ? 'Continue Shopping' : 'More Auctions'}
              </button>
            </div>
          </div>
        </div>

        {/* Reference */}
        {reference && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Ref: <span className="font-mono">{reference}</span>
          </p>
        )}
      </div>
    </main>
  )
}
