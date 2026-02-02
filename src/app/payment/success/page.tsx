'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function PaymentSuccessPage() {
  const params = useSearchParams()
  const router = useRouter()
  const reference = params.get('reference')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!reference) {
      setStatus('error')
      return
    }

    const verifyPayment = async () => {
      const res = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })

      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    }

    verifyPayment()
  }, [reference])

  if (status === 'loading') {
    return <p className="p-6">Verifying payment…</p>
  }

  if (status === 'error') {
    return <p className="p-6 text-red-600">Payment verification failed</p>
  }

  return (
    <main className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold text-green-700">
        ✅ Payment Successful
      </h1>

      <p className="mt-3">
        Thank you for completing your payment.
      </p>

      <button
        className="mt-6 bg-black text-white px-4 py-2"
        onClick={() => router.push('/auctions')}
      >
        Back to Auctions
      </button>
    </main>
  )
}
