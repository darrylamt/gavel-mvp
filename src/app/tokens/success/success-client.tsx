'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function TokenSuccessClient() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  )

  useEffect(() => {
    if (!reference) {
      setStatus('error')
      return
    }

    const verify = async () => {
      const res = await fetch('/api/tokens/verify', {
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

    verify()
  }, [reference])

  if (status === 'loading') {
    return <p className="p-6">Verifying payment…</p>
  }

  if (status === 'error') {
    return (
      <p className="p-6 text-red-600">
        Token verification failed. Contact support.
      </p>
    )
  }

  return (
    <p className="p-6 text-green-600 font-bold">
      ✅ Tokens added successfully
    </p>
  )
}
