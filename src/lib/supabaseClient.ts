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

/** Returns headers with Authorization Bearer token for authenticated API requests (e.g. uploads). */
export async function getSessionHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return headers
}