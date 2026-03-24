import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/swap/models
// List all phone models including inactive. Requires admin.
export async function GET(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('swap_phone_models')
    .select('*')
    .order('brand', { ascending: true })
    .order('model', { ascending: true })

  if (error) {
    console.error('Failed to fetch phone models:', error)
    return NextResponse.json({ error: 'Failed to fetch phone models' }, { status: 500 })
  }

  return NextResponse.json({ models: data ?? [] })
}

// POST /api/admin/swap/models
// Create a new phone model. Requires admin.
// Body: all SwapPhoneModel fields except id, created_at, has_back_glass.
// Also creates a blank deduction rates row for this model.
export async function POST(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { brand, model, ...rest } = body

  if (!brand || typeof brand !== 'string' || brand.trim() === '') {
    return NextResponse.json({ error: 'brand is required' }, { status: 400 })
  }

  if (!model || typeof model !== 'string' || model.trim() === '') {
    return NextResponse.json({ error: 'model is required' }, { status: 400 })
  }

  // Insert the phone model
  const { data: newModel, error: modelError } = await supabase
    .from('swap_phone_models')
    .insert({
      brand: brand.trim(),
      model: model.trim(),
      ...rest,
    })
    .select('*')
    .single()

  if (modelError || !newModel) {
    console.error('Failed to create phone model:', modelError)
    return NextResponse.json({ error: 'Failed to create phone model' }, { status: 500 })
  }

  // Create a blank deduction rates row for this model
  const { error: ratesError } = await supabase
    .from('swap_deduction_rates')
    .insert({ model_id: newModel.id })

  if (ratesError) {
    console.error('Failed to create blank deduction rates for model:', ratesError)
    // Non-fatal: model was created; log and continue
  }

  return NextResponse.json({ model: newModel }, { status: 201 })
}
