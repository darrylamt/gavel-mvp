import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const createBrowserSupabaseClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'gavel-auth',
    },
  })

declare global {
  var __gavelSupabaseClient: ReturnType<typeof createBrowserSupabaseClient> | undefined
}

export const supabase = globalThis.__gavelSupabaseClient ?? createBrowserSupabaseClient()

if (typeof window !== 'undefined') {
  globalThis.__gavelSupabaseClient = supabase
}