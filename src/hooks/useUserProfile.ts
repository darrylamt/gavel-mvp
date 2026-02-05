'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type UserProfile = {
  id: string
  username: string | null
  tokens: number
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, tokens')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      setProfile(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    // Initial load
    loadProfile()

    // 🔑 CRITICAL: react to login/logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile()
      } else {
        setProfile(null)
      }
    })

    // Refresh when tab regains focus
    const onFocus = () => loadProfile()
    window.addEventListener('focus', onFocus)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return { profile, loading }
}
