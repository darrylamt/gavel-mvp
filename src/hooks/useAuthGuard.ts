'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

interface UseAuthGuardOptions {
  redirectTo?: string
  allowPublic?: boolean
  redirectIfAuthenticated?: string
}

export function useAuthGuard({
  redirectTo = '/login',
  allowPublic = false,
  redirectIfAuthenticated
}: UseAuthGuardOptions = {}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    // Fast: reads from localStorage, no network call
    const getLocalUser = async (): Promise<User | null> => {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.user ?? null
    }

    const checkAuth = async () => {
      try {
        const authUser = await getLocalUser()
        if (!isMounted) return

        if (authUser && redirectIfAuthenticated) {
          setUser(authUser)
          setIsChecking(false)
          setLoading(false)
          window.location.href = redirectIfAuthenticated
          return
        }

        if (!authUser && !allowPublic) {
          setUser(null)
          setIsChecking(false)
          setLoading(false)
          router.replace(redirectTo)
          return
        }

        setUser(authUser)
      } catch (error) {
        console.error('Auth check failed:', error)
        if (!allowPublic) {
          router.replace(redirectTo)
        }
      } finally {
        if (isMounted) {
          setIsChecking(false)
          setLoading(false)
        }
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return

      const authUser = session?.user ?? null

      if (authUser && redirectIfAuthenticated) {
        setUser(authUser)
        setIsChecking(false)
        setLoading(false)
        window.location.href = redirectIfAuthenticated
        return
      }

      if (!authUser && !allowPublic) {
        setUser(null)
        setIsChecking(false)
        setLoading(false)
        router.replace(redirectTo)
        return
      }

      setUser(authUser)
      setIsChecking(false)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [allowPublic, redirectTo, redirectIfAuthenticated, router])

  return { user, loading, isChecking }
}
