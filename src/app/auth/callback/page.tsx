'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Parse tokens from URL hash (e.g. #access_token=...&refresh_token=...)
        if (typeof window === 'undefined') {
          router.replace('/login')
          return
        }

        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash

        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          // Set session in Supabase client
          const { data: setData, error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (setError) {
            console.error('Failed to set session from URL tokens:', setError)
            router.replace('/login')
            return
          }

          // Remove tokens from the URL so they aren't visible in the address bar
          if (window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
          }

          if (setData?.session) {
            router.replace('/auctions')
            return
          }
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
