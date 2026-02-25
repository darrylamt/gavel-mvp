import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export type AuthUser = { id: string }

/**
 * Returns the authenticated user from the request's Authorization Bearer token.
 * Use for API routes that require a logged-in user.
 */
export async function getAuthUser(
  request: Request
): Promise<{ error: NextResponse } | { user: AuthUser }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: NextResponse.json({ error: 'Server configuration missing' }, { status: 500 }) }
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const {
    data: { user },
    error,
  } = await anon.auth.getUser(token)
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user: { id: user.id } }
}

/**
 * Returns the authenticated user and their profile role.
 * Use for routes that need to check seller/admin.
 */
export async function getAuthUserWithRole(
  request: Request
): Promise<
  | { error: NextResponse }
  | { user: AuthUser; role: string | null }
> {
  const result = await getAuthUser(request)
  if ('error' in result) return result

  if (!serviceRoleKey) {
    return { error: NextResponse.json({ error: 'Server configuration missing' }, { status: 500 }) }
  }
  const service = createClient(supabaseUrl!, serviceRoleKey)
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', result.user.id)
    .maybeSingle()

  return {
    user: result.user,
    role: profile?.role ?? null,
  }
}

export function createServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase env')
  return createClient(supabaseUrl, serviceRoleKey)
}
