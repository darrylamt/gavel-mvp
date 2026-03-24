import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH /api/admin/swap/models/[id]
// Update a phone model. Requires admin.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing model id' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Exclude immutable fields
  const { id: _id, created_at: _created_at, ...updates } = body

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('swap_phone_models')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Failed to update phone model:', error)
    return NextResponse.json({ error: 'Failed to update phone model' }, { status: 500 })
  }

  return NextResponse.json({ model: data })
}

// DELETE /api/admin/swap/models/[id]
// Soft-delete a phone model by setting is_active=false. Requires admin.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing model id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('swap_phone_models')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Failed to deactivate phone model:', error)
    return NextResponse.json({ error: 'Failed to deactivate phone model' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
