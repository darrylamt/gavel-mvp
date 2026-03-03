import { AppState } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import { secureStorage } from './storage'

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    storageKey: 'gavel-mobile-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
    return
  }
  supabase.auth.stopAutoRefresh()
})
