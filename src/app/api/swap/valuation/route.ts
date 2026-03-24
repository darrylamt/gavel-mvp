import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { calculateTradeInValue } from '@/lib/swap-valuation'
import type { SwapPhoneModel, SwapDeductionRates, SwapSubmissionInput } from '@/types/swap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/swap/valuation
// Computes trade-in value without saving a submission. No auth required.
// Body: SwapSubmissionInput fields
export async function POST(req: Request) {
  let body: Partial<SwapSubmissionInput>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { model_id } = body

  if (!model_id) {
    return NextResponse.json({ error: 'Missing required field: model_id' }, { status: 400 })
  }

  // Fetch phone model
  const { data: modelData, error: modelError } = await supabase
    .from('swap_phone_models')
    .select('*')
    .eq('id', model_id)
    .eq('is_active', true)
    .maybeSingle()

  if (modelError || !modelData) {
    return NextResponse.json({ error: 'Phone model not found or inactive' }, { status: 404 })
  }

  const model = modelData as SwapPhoneModel

  // Fetch deduction rates for this model
  const { data: ratesData, error: ratesError } = await supabase
    .from('swap_deduction_rates')
    .select('*')
    .eq('model_id', model_id)
    .maybeSingle()

  if (ratesError || !ratesData) {
    return NextResponse.json(
      { error: 'Deduction rates not configured for this model' },
      { status: 500 }
    )
  }

  const rates = ratesData as SwapDeductionRates

  // Build submission input with safe defaults
  const submissionInput: SwapSubmissionInput = {
    model_id,
    storage: body.storage ?? '',
    color: body.color ?? '',
    battery_health: Number(body.battery_health ?? 100),
    battery_replaced: body.battery_replaced ?? false,
    screen_condition: body.screen_condition ?? 'perfect',
    screen_replaced: body.screen_replaced ?? false,
    back_glass_condition: body.back_glass_condition ?? null,
    back_glass_replaced: body.back_glass_replaced ?? null,
    camera_glass_cracked: body.camera_glass_cracked ?? false,
    front_camera_working: body.front_camera_working ?? true,
    rear_cameras_status: body.rear_cameras_status ?? {},
    face_id_working: body.face_id_working ?? null,
    fingerprint_working: body.fingerprint_working ?? null,
    body_condition: body.body_condition ?? 'perfect',
    other_issues: body.other_issues ?? null,
    water_damage: false,
    photos: body.photos ?? [],
    battery_health_screenshot: body.battery_health_screenshot ?? '',
    desired_inventory_id: body.desired_inventory_id ?? null,
  }

  const {
    value: calculated_trade_in_value,
    breakdown: deduction_breakdown,
    conditionScore: condition_score,
  } = calculateTradeInValue(model, rates, submissionInput)

  return NextResponse.json({
    calculated_trade_in_value,
    deduction_breakdown,
    condition_score,
  })
}
