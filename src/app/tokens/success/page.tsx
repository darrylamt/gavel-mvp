'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function TokenSuccessPage() {
  const params = useSearchParams()
  const reference = params.get('reference')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!reference) {
      setStatus('error')
      return
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/tokens/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        })

        if (!res.ok) throw new Error()
        setStatus('success')
      } catch {
        setStatus('error')
      }
    }

    verify()
  }, [reference])

  return (
    <main className="p-6 max-w-md mx-auto text-center">
      {status === 'loading' && <p>Verifying payment…</p>}
      {status === 'success' && (
        <p className="text-green-600 font-bold">
          ✅ Tokens added successfully
        </p>
      )}
      {status === 'error' && (
        <p className="text-red-600 font-bold">
          ❌ Failed to verify payment
        </p>
      )}
    </main>
  )
}
