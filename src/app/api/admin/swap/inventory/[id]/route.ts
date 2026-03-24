import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH /api/admin/swap/inventory/[id]
// Update inventory item fields: price, quantity, condition, is_active. Requires admin.
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
    return NextResponse.json({ error: 'Missing inventory item id' }, { status: 400 })
  }

  let body: {
    price?: number
    quantity?: number
    condition?: string
    is_active?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.price !== undefined) {
    if (!Number.isFinite(body.price) || body.price < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }
    updates.price = body.price
  }

  if (body.quantity !== undefined) {
    if (!Number.isFinite(body.quantity) || body.quantity < 0 || !Number.isInteger(body.quantity)) {
      return NextResponse.json({ error: 'quantity must be a non-negative integer' }, { status: 400 })
    }
    updates.quantity = body.quantity
  }

  if (body.condition !== undefined) {
    updates.condition = body.condition
  }

  if (body.is_active !== undefined) {
    updates.is_active = body.is_active
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('swap_inventory')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      swap_phone_models(*)
    `)
    .single()

  if (error) {
    console.error('Failed to update inventory item:', error)
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

// DELETE /api/admin/swap/inventory/[id]
// Remove an inventory item. Requires admin.
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
    return NextResponse.json({ error: 'Missing inventory item id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('swap_inventory')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete inventory item:', error)
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
