import { Suspense } from 'react'
import TokenSuccessClient from './success-client'

export default function TokenSuccessPage() {
  return (
    <Suspense fallback={<p className="p-6">Verifying payment…</p>}>
      <TokenSuccessClient />
    </Suspense>
  )
}
