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

        console.log('OAuth callback - tokens in URL:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
        })

        if (accessToken && refreshToken) {
          // Set session in Supabase client from OAuth tokens
          const { error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (setError) {
            console.error('Failed to set session from URL tokens:', setError)
            router.replace('/login')
            return
          }

          // Verify session was actually set by fetching it
          // (Supabase persists to localStorage/sessionStorage)
          const { data: verifyData, error: verifyError } = await supabase.auth.getSession()
          console.log('Session verification after setSession:', {
            sessionExists: !!verifyData?.session,
            error: verifyError,
          })

          if (verifyData?.session) {
            // Remove tokens from the URL so they aren't visible in the address bar
            if (window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
            }
            router.replace('/auctions')
            return
          } else {
            console.error('Session not set after setSession call')
            router.replace('/login')
            return
          }
        }

        // Fallback: check for existing session (in case page is re-visited)
        console.log('No OAuth tokens in URL, checking existing session...')
        const { data: current } = await supabase.auth.getSession()
        if (current.session) {
          console.log('Found existing session, redirecting to auctions')
          router.replace('/auctions')
        } else {
          console.log('No session found, redirecting to login')
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
