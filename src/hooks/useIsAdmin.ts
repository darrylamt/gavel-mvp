'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setIsAdmin(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      setIsAdmin(profile?.role === 'admin')
    }

    checkAdmin()
  }, [])

  return isAdmin
}
