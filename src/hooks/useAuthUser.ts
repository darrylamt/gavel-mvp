'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession()

      if (sessionData.session?.user) {
        setUser(sessionData.session.user)
        setLoading(false)
        return
      }

      const { data: refreshed } = await supabase.auth.refreshSession()
      setUser(refreshed.session?.user ?? null)
      setLoading(false)
    }

    loadUser()

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
