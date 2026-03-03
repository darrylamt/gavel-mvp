import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      console.error('[BAN] No token provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const anon = createClient(supabaseUrl, supabaseAnonKey)
    const service = createClient(supabaseUrl, serviceRoleKey)

    const {
      data: { user },
      error: userError,
    } = await anon.auth.getUser(token)

    if (userError || !user) {
      console.error('[BAN] Auth error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: me, error: meError } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string | null }>()

    if (meError) {
      console.error('[BAN] Error fetching admin profile:', meError)
    }

    if (me?.role !== 'admin') {
      console.error('[BAN] Forbidden: not admin', { userId: user.id, role: me?.role })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = await context.params

    const { data: target, error: targetError } = await service
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle<{ id: string; role: string | null }>()

    if (targetError) {
      console.error('[BAN] Error fetching target user:', targetError)
    }

    if (!target) {
      console.error('[BAN] Target user not found:', userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (target.role === 'admin') {
      console.error('[BAN] Attempt to ban admin account:', userId)
      return NextResponse.json({ error: 'Cannot ban an admin account' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { data: updateResult, error: updateError } = await service
      .from('profiles')
      .update({ banned_at: now })
      .eq('id', userId)
      .select()

    if (updateError) {
      console.error('[BAN] Update error:', updateError)
      return NextResponse.json({ error: updateError.message, debug: updateError }, { status: 500 })
    }

    console.log(`[BAN] User ${userId} banned at ${now}`)
    return NextResponse.json({ success: true, banned_at: now, updateResult })
  } catch (err) {
    console.error('[BAN] Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error', debug: String(err) }, { status: 500 })
  }
}
