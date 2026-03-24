import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/swap/slots
// List all future available slots. Requires admin.
export async function GET(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('swap_available_slots')
    .select('*')
    .gt('slot_datetime', now)
    .order('slot_datetime', { ascending: true })

  if (error) {
    console.error('Failed to fetch available slots:', error)
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  }

  return NextResponse.json({ slots: data ?? [] })
}

// POST /api/admin/swap/slots
// Create a new slot. Requires admin.
// Body: { slot_datetime: string }
// Returns the created slot.
export async function POST(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { slot_datetime?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { slot_datetime } = body

  if (!slot_datetime || typeof slot_datetime !== 'string' || slot_datetime.trim() === '') {
    return NextResponse.json({ error: 'slot_datetime is required' }, { status: 400 })
  }

  // Validate it's a parseable date
  const parsedDate = new Date(slot_datetime)
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'slot_datetime must be a valid ISO date string' }, { status: 400 })
  }

  if (parsedDate <= new Date()) {
    return NextResponse.json({ error: 'slot_datetime must be in the future' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('swap_available_slots')
    .insert({ slot_datetime: parsedDate.toISOString() })
    .select('*')
    .single()

  if (error || !data) {
    console.error('Failed to create slot:', error)
    return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 })
  }

  return NextResponse.json({ slot: data }, { status: 201 })
}
