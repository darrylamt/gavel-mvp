'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkAdmin = async () => {
      const { data: auth } = await supabase.auth.getUser()

      if (!auth.user) {
        if (mounted) setIsAdmin(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      if (mounted) {
        setIsAdmin(data?.role === 'admin')
      }
    }

    checkAdmin()

    return () => {
      mounted = false
    }
  }, [])

  return isAdmin
}