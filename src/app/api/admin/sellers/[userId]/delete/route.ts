import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
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

  // Prevent deleting admin accounts
  const { data: target } = await service
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle<{ id: string; role: string | null }>()

  if (!target) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  if (target.role === 'admin') {
    return NextResponse.json({ error: 'Cannot delete an admin account' }, { status: 400 })
  }

  // Delete user from auth and all related data
  const { error: deleteError } = await service.auth.admin.deleteUser(userId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Optionally, clean up related data in your own tables here

  return NextResponse.json({ success: true })
}
