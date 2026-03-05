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

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        const authUser = session?.user ?? null

        // Redirect authenticated users if redirectIfAuthenticated is set
        if (authUser && redirectIfAuthenticated) {
          router.replace(redirectIfAuthenticated)
          return
        }

        // Redirect unauthenticated users if not allowing public access
        if (!authUser && !allowPublic) {
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      const authUser = session?.user ?? null
      
      // Redirect if authenticated and redirectIfAuthenticated is set
      if (authUser && redirectIfAuthenticated) {
        router.replace(redirectIfAuthenticated)
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
