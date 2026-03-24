import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE /api/admin/swap/slots/[id]
// Remove an unbooked slot. Returns 400 if the slot is already booked. Requires admin.
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
    return NextResponse.json({ error: 'Missing slot id' }, { status: 400 })
  }

  // Fetch the slot to check if it's booked
  const { data: slot, error: fetchError } = await supabase
    .from('swap_available_slots')
    .select('id, is_booked')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to fetch slot:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch slot' }, { status: 500 })
  }

  if (!slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }

  if (slot.is_booked) {
    return NextResponse.json(
      { error: 'Cannot delete a slot that is already booked' },
      { status: 400 }
    )
  }

  const { error: deleteError } = await supabase
    .from('swap_available_slots')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Failed to delete slot:', deleteError)
    return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
