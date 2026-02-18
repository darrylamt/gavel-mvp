'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PaymentSuccessClient() {
  const params = useSearchParams()
  const router = useRouter()
  const reference = params.get('reference')
  const paymentType = params.get('type')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    reference ? 'loading' : 'error'
  )

  useEffect(() => {
    if (!reference) return

    const verifyPayment = async () => {
      const verifyEndpoint = paymentType === 'shop' ? '/api/shop-payments/verify' : '/api/auction-payments/verify'

      const res = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })

      if (res.ok) {
        /* Refresh auth session to prevent logout */
        await supabase.auth.refreshSession()

        if (paymentType === 'shop' && typeof window !== 'undefined') {
          window.localStorage.setItem('gavel:cart-items', JSON.stringify([]))
          window.dispatchEvent(new CustomEvent('gavel:cart-items-changed'))
        }

        setStatus('success')
      } else {
        setStatus('error')
      }
    }

    verifyPayment()
  }, [reference, paymentType])

  if (status === 'loading') {
    return <p className="p-6 text-center">Verifying payment…</p>
  }

  if (status === 'error') {
    return <p className="p-6 text-center text-red-600">Payment verification failed</p>
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center p-6">
      <div className="w-full rounded-2xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-full bg-green-100/40">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-green-100">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-3xl font-bold text-white">
              ✓
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900">Payment successful!</h1>
        <p className="mt-3 text-gray-600">
          {paymentType === 'shop'
            ? 'Your shop payment has been confirmed successfully.'
            : 'Your auction payment has been confirmed successfully.'}
        </p>

        <button
          className="mt-8 inline-flex rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
          onClick={() => router.push(paymentType === 'shop' ? '/shop' : '/auctions')}
        >
          {paymentType === 'shop' ? 'Continue Shopping' : 'Continue to Auctions'}
        </button>
      </div>
    </main>
  )
}
