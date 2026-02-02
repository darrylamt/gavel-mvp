'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function TokenSuccessClient() {
  const params = useSearchParams()
  const reference = params.get('reference')

      useEffect(() => {
        if (!reference) return

        const verify = async () => {
          await fetch('/api/tokens/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference }),
          })

          // 🔁 Force refresh so navbar refetches token balance
          window.location.href = '/'
        }

        verify()
      }, [reference])

  return (
    <main className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">
        Tokens Purchased 🎉
      </h1>
      <p className="text-gray-600">
        Your tokens have been added to your account.
      </p>
    </main>
  )
}
