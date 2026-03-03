import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/src/lib/supabase'

type AuthSessionState = {
  loading: boolean
  session: Session | null
  user: User | null
}

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({
    loading: true,
    session: null,
    user: null,
  })

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setState({
        loading: false,
        session: data.session,
        user: data.session?.user ?? null,
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setState({
        loading: false,
        session,
        user: session?.user ?? null,
      })
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}
