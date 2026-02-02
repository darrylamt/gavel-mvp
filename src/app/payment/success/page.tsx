import { Suspense } from 'react'
import PaymentSuccessClient from './payment-success-client'

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading payment status…</p>}>
      <PaymentSuccessClient />
    </Suspense>
  )
}
