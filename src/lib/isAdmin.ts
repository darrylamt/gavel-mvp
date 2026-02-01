import { supabase } from './supabaseClient'

export async function isAdmin() {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .single()

  return profile?.role === 'admin'
}
