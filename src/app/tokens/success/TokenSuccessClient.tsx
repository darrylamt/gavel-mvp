'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function TokenSuccessClient() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference')
  const [status, setStatus] = useState('Verifying payment…')

  useEffect(() => {
    if (!reference) return

    const verify = async () => {
      const res = await fetch('/api/tokens/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })

      if (res.ok) {
        /* Refresh auth session to prevent logout */
        await supabase.auth.refreshSession()
        setStatus('✅ Tokens added to your account')
      } else {
        setStatus('❌ Verification failed')
      }
    }

    verify()
  }, [reference])

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Token Purchase</h1>
      <p className="mt-2">{status}</p>
    </main>
  )
}
