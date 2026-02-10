'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth callback error:', error)
        router.replace('/login')
        return
      }

      if (data.session) {
        // ✅ Session is now stored
        router.replace('/auctions')
      } else {
        router.replace('/login')
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Signing you in…
    </div>
  )
}
