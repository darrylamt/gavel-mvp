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
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, username, tokens')
      .eq('id', auth.user.id)
      .single()

    if (data) {
      setProfile(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadProfile()

    // 🔁 refresh on tab focus (THIS fixes token updates)
    const onFocus = () => loadProfile()
    window.addEventListener('focus', onFocus)

    // 🔐 refresh on auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => {
      window.removeEventListener('focus', onFocus)
      sub.subscription.unsubscribe()
    }
  }, [])

  return { profile, loading }
}
