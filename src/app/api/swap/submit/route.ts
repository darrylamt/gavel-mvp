import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUser } from '@/lib/apiAuth'
import { calculateTradeInValue } from '@/lib/swap-valuation'
import type { SwapPhoneModel, SwapDeductionRates, SwapSubmissionInput } from '@/types/swap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/swap/submit
// Creates a new swap submission. Requires auth.
export async function POST(req: Request) {
  const authResult = await getAuthUser(req)
  if ('error' in authResult) return authResult.error

  const { user } = authResult

  let body: SwapSubmissionInput & {
    desired_inventory_id?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  const requiredFields = [
    'model_id',
    'storage',
    'color',
    'battery_health',
    'screen_condition',
    'body_condition',
    'photos',
    'battery_health_screenshot',
  ] as const

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      )
    }
  }

  if (!Array.isArray(body.photos) || body.photos.length === 0) {
    return NextResponse.json(
      { error: 'At least one photo is required' },
      { status: 400 }
    )
  }

  // Validate battery health minimum
  const batteryHealth = Number(body.battery_health)
  if (!Number.isFinite(batteryHealth) || batteryHealth < 60) {
    return NextResponse.json(
      { error: 'Battery health must be at least 60%' },
      { status: 400 }
    )
  }

  // Reject water damaged devices
  if (body.water_damage === true) {
    return NextResponse.json(
      { error: 'Devices with water damage are not eligible for swap' },
      { status: 400 }
    )
  }

  // Fetch the phone model
  const { data: modelData, error: modelError } = await supabase
    .from('swap_phone_models')
    .select('*')
    .eq('id', body.model_id)
    .eq('is_active', true)
    .maybeSingle()

  if (modelError || !modelData) {
    return NextResponse.json(
      { error: 'Phone model not found or inactive' },
      { status: 404 }
    )
  }

  const model = modelData as SwapPhoneModel

  // Fetch deduction rates for this model
  const { data: ratesData, error: ratesError } = await supabase
    .from('swap_deduction_rates')
    .select('*')
    .eq('model_id', body.model_id)
    .maybeSingle()

  if (ratesError || !ratesData) {
    return NextResponse.json(
      { error: 'Deduction rates not configured for this model' },
      { status: 500 }
    )
  }

  const rates = ratesData as SwapDeductionRates

  // Recalculate trade-in value server-side
  const submissionInput: SwapSubmissionInput = {
    model_id: body.model_id,
    storage: body.storage,
    color: body.color,
    battery_health: batteryHealth,
    battery_replaced: body.battery_replaced ?? false,
    screen_condition: body.screen_condition,
    screen_replaced: body.screen_replaced ?? false,
    back_glass_condition: body.back_glass_condition ?? null,
    back_glass_replaced: body.back_glass_replaced ?? null,
    camera_glass_cracked: body.camera_glass_cracked ?? false,
    front_camera_working: body.front_camera_working ?? true,
    rear_cameras_status: body.rear_cameras_status ?? {},
    face_id_working: body.face_id_working ?? null,
    fingerprint_working: body.fingerprint_working ?? null,
    body_condition: body.body_condition,
    other_issues: body.other_issues ?? null,
    water_damage: false,
    photos: body.photos,
    battery_health_screenshot: body.battery_health_screenshot,
    desired_inventory_id: body.desired_inventory_id ?? null,
  }

  const { value: calculated_trade_in_value, breakdown: deduction_breakdown, conditionScore: condition_score } =
    calculateTradeInValue(model, rates, submissionInput)

  // Insert into swap_submissions
  const { data: submission, error: insertError } = await supabase
    .from('swap_submissions')
    .insert({
      user_id: user.id,
      model_id: submissionInput.model_id,
      storage: submissionInput.storage,
      color: submissionInput.color,
      battery_health: submissionInput.battery_health,
      battery_replaced: submissionInput.battery_replaced,
      screen_condition: submissionInput.screen_condition,
      screen_replaced: submissionInput.screen_replaced,
      back_glass_condition: submissionInput.back_glass_condition,
      back_glass_replaced: submissionInput.back_glass_replaced,
      camera_glass_cracked: submissionInput.camera_glass_cracked,
      front_camera_working: submissionInput.front_camera_working,
      rear_cameras_status: submissionInput.rear_cameras_status,
      face_id_working: submissionInput.face_id_working,
      fingerprint_working: submissionInput.fingerprint_working,
      body_condition: submissionInput.body_condition,
      other_issues: submissionInput.other_issues,
      water_damage: false,
      photos: submissionInput.photos,
      battery_health_screenshot: submissionInput.battery_health_screenshot,
      desired_inventory_id: submissionInput.desired_inventory_id,
      calculated_trade_in_value,
      deduction_breakdown,
      condition_score,
      status: 'pending_deposit',
    })
    .select('id')
    .single()

  if (insertError || !submission) {
    console.error('Failed to insert swap submission:', insertError)
    return NextResponse.json(
      { error: 'Failed to create swap submission' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    submission_id: submission.id,
    calculated_trade_in_value,
    deduction_breakdown,
    condition_score,
  })
}
