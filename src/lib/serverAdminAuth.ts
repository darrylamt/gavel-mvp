import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import 'server-only'

export type AdminAuthResult =
  | {
      ok: true
      service: any
      adminUserId: string
    }
  | {
      ok: false
      error: NextResponse
    }

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return {
      ok: false,
      error: NextResponse.json({ error: 'Server configuration missing' }, { status: 500 }),
    }
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return { ok: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return { ok: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return { ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, service, adminUserId: user.id }
}
