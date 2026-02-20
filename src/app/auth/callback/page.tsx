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
      const params = new URLSearchParams(window.location.search)
      const flowType = params.get('type')
      const next = params.get('next')

      const getTarget = () => {
        if (flowType === 'recovery') {
          return '/update-password'
        }

        if (next && next.startsWith('/')) {
          return next
        }

        return '/auctions'
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          if (isMounted) {
            if (window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname)
            }
            router.replace(getTarget())
          }
          return
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (session && isMounted) {
              if (window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname)
              }

              if (unsubscribe) {
                unsubscribe()
              }

              router.replace(getTarget())
            }
          }
        )

        unsubscribe = subscription.unsubscribe

        const timeout = setTimeout(() => {
          if (isMounted) {
            if (unsubscribe) {
              unsubscribe()
            }
            router.replace(flowType === 'recovery' ? '/update-password' : '/login')
          }
        }, 5000)

        return () => {
          clearTimeout(timeout)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        if (isMounted) {
          router.replace(flowType === 'recovery' ? '/update-password' : '/login')
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
