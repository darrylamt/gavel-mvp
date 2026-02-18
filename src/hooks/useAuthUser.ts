'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    }

    loadUser()

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
