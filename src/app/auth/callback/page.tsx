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
          if (session.access_token) {
            // Ensure new users get 3 tokens (only if they don't have any)
            if (session.user?.id) {
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('token_balance')
                .eq('id', session.user.id)
                .maybeSingle()

              const existingTokenBalance = existingProfile?.token_balance ?? null
              const shouldNormalizeLegacySeed = existingTokenBalance === 100

              // Set a starter balance for new users and normalize legacy 100-token seed accounts.
              if (!existingProfile || !existingTokenBalance || shouldNormalizeLegacySeed) {
                await supabase
                  .from('profiles')
                  .upsert(
                    {
                      id: session.user.id,
                      token_balance: 3,
                    },
                    {
                      onConflict: 'id',
                      ignoreDuplicates: false
                    }
                  )
              }

              // Link referral if a gavel_ref cookie is present (new user signup)
              if (!existingProfile) {
                const gavelRef = document.cookie
                  .split(';')
                  .find((c) => c.trim().startsWith('gavel_ref='))
                  ?.split('=')[1]

                if (gavelRef) {
                  const referralCode = decodeURIComponent(gavelRef)
                  fetch('/api/referrals/link', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ referral_code: referralCode }),
                  }).catch(() => {})
                }
              }
            }

            await fetch('/api/whatsapp/account-created', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            })
          }

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
