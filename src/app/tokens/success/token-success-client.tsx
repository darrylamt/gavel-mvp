'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function TokenSuccessClient() {
  const params = useSearchParams()
  const router = useRouter()
  const reference = params.get('reference')

  const [status, setStatus] = useState('Verifying payment…')

  useEffect(() => {
    if (!reference) {
      setStatus('Invalid payment reference')
      return
    }

    fetch('/api/tokens/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    })
      .then((res) => res.json())
      .then(async () => {
        /* Refresh auth session to prevent logout */
        await supabase.auth.refreshSession()
        setStatus('Tokens added successfully 🎉')
        setTimeout(() => router.push('/'), 2000)
      })
      .catch(() => {
        setStatus('Verification failed')
      })
  }, [reference, router])

  return <p className="p-6">{status}</p>
}
