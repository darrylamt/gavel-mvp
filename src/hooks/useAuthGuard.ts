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

/**
 * Hook to protect routes that require authentication
 * Redirects to login if user is not authenticated
 * @param options - Configuration options
 * @returns User object and loading state
 */
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

    const resolveUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        return session.user
      }

      const { data: refreshed } = await supabase.auth.refreshSession()
      if (refreshed.session?.user) {
        return refreshed.session.user
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      return user ?? null
    }

    const checkAuth = async () => {
      try {
        const authUser = await resolveUser()
        if (!isMounted) return

        // Redirect authenticated users if redirectIfAuthenticated is set
        if (authUser && redirectIfAuthenticated) {
          setUser(authUser)
          router.replace(redirectIfAuthenticated)
          return
        }

        // Redirect unauthenticated users if not allowing public access
        if (!authUser && !allowPublic) {
          setUser(null)
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

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return

      let authUser = session?.user ?? null
      if (!authUser) {
        try {
          authUser = await resolveUser()
        } catch {
          authUser = null
        }
        if (!isMounted) return
      }
      
      // Redirect if authenticated and redirectIfAuthenticated is set
      if (authUser && redirectIfAuthenticated) {
        setUser(authUser)
        setIsChecking(false)
        setLoading(false)
        router.replace(redirectIfAuthenticated)
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
