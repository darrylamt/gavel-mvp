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
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const user = session.user

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
    // Initial load (IMPORTANT)
    loadProfile()

    // React to auth changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    // Refresh on tab focus (after redirects like Paystack)
    const onFocus = () => loadProfile()
    window.addEventListener('focus', onFocus)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return { profile, loading }
}
