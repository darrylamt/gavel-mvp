'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    let isMounted = true

    const checkAdmin = async () => {
      const { data: auth, error: authError } =
        await supabase.auth.getUser()

      if (authError || !auth?.user) {
        if (isMounted) setIsAdmin(false)
        return
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role')
          .eq('id', auth.user.id)
          .single()

      if (profileError) {
        if (isMounted) setIsAdmin(false)
        return
      }

      if (isMounted) {
        setIsAdmin(profile?.role === 'admin')
      }
    }

    checkAdmin()

    return () => {
      isMounted = false
    }
  }, [])

  return isAdmin
}
