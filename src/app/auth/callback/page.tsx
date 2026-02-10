'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Try to parse and store session from the OAuth redirect URL
        // (Supabase OAuth returns tokens in the URL hash)
        const { data, error } = await supabase.auth.getSessionFromUrl()

        if (error) {
          console.error('Auth callback error (getSessionFromUrl):', error)
          router.replace('/login')
          return
        }

        // Remove tokens from the URL so they aren't visible in the address bar
        if (typeof window !== 'undefined' && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
        }

        if (data?.session) {
          router.replace('/auctions')
          return
        }

        // Fallback: check existing session
        const { data: current } = await supabase.auth.getSession()
        if (current.session) {
          router.replace('/auctions')
        } else {
          router.replace('/login')
        }
      } catch (err) {
        console.error('Auth callback exception:', err)
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
