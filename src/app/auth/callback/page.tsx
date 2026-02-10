'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | null = null

    const handleCallback = async () => {
      try {
        // First, check if we already have a session from the OAuth redirect
        // (Supabase SDK automatically processes the URL hash on page load)
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          console.log('Session found after OAuth redirect')
          if (isMounted) {
            // Clean up the URL hash before redirecting
            if (window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname)
            }
            router.replace('/auctions')
          }
          return
        }

        // If no session yet, listen for auth state changes
        // (This handles the case where session is being processed)
        console.log('No session yet, listening for auth changes...')
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (session && isMounted) {
              console.log('Auth state changed - session established')
              
              // Clean up the URL hash
              if (window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname)
              }
              
              // Unsubscribe before redirecting
              if (unsubscribe) {
                unsubscribe()
              }
              
              router.replace('/auctions')
            }
          }
        )

        unsubscribe = subscription.unsubscribe

        // Timeout: if no session after 5 seconds, give up
        const timeout = setTimeout(() => {
          if (isMounted) {
            console.error('Auth callback timeout - no session established')
            if (unsubscribe) {
              unsubscribe()
            }
            router.replace('/login')
          }
        }, 5000)

        return () => {
          clearTimeout(timeout)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        if (isMounted) {
          router.replace('/login')
        }
      }
    }

    handleCallback()

    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Signing you in…
    </div>
  )
}
