import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string | null }>()

  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await context.params

  const { data: target } = await service
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle<{ id: string; role: string | null }>()

  if (!target) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  if (target.role === 'admin') {
    return NextResponse.json({ error: 'Cannot ban an admin account' }, { status: 400 })
  }

  const [profileUpdate, shopsUpdate] = await Promise.all([
    service
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', userId),
    service
      .from('shops')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('owner_id', userId)
      .eq('status', 'active'),
  ])

  if (profileUpdate.error) {
    return NextResponse.json({ error: profileUpdate.error.message }, { status: 500 })
  }

  if (shopsUpdate.error) {
    return NextResponse.json({ error: shopsUpdate.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
