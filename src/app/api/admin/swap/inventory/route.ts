import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/swap/inventory
// List all inventory items (including inactive) with model joined.
export async function GET(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('swap_inventory')
    .select(`
      *,
      swap_phone_models(*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch swap inventory:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }

  return NextResponse.json({ inventory: data ?? [] })
}

// POST /api/admin/swap/inventory
// Add a new inventory item. Requires admin.
// Body: { model_id, storage, color, condition, price, quantity }
// Returns the created item.
export async function POST(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    model_id?: string
    storage?: string
    color?: string
    condition?: string
    price?: number
    quantity?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { model_id, storage, color, condition, price, quantity } = body

  if (!model_id || !storage || !color || !condition || price === undefined || quantity === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: model_id, storage, color, condition, price, quantity' },
      { status: 400 }
    )
  }

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
  }

  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
    return NextResponse.json({ error: 'quantity must be a non-negative integer' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('swap_inventory')
    .insert({
      model_id,
      storage,
      color,
      condition,
      price,
      quantity,
    })
    .select(`
      *,
      swap_phone_models(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to create inventory item:', error)
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 })
  }

  return NextResponse.json({ item: data }, { status: 201 })
}
