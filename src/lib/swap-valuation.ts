import type {
  SwapPhoneModel,
  SwapDeductionRates,
  SwapSubmissionInput,
  DeductionBreakdownItem,
  ValuationResult,
  SwapConditionScore,
} from '@/types/swap'

export function calculateTradeInValue(
  model: SwapPhoneModel,
  rates: SwapDeductionRates,
  submission: SwapSubmissionInput
): ValuationResult {
  let value = model.base_trade_in_value
  const breakdown: DeductionBreakdownItem[] = []

  // Screen
  if (submission.screen_replaced) {
    value -= rates.screen_replaced_fixed_deduction
    breakdown.push({
      reason: 'Screen previously replaced (water resistance affected)',
      amount: rates.screen_replaced_fixed_deduction,
    })
  }
  if (submission.screen_condition === 'cracked') {
    value -= rates.screen_replacement_cost
    breakdown.push({
      reason: 'Cracked screen',
      amount: rates.screen_replacement_cost,
    })
  }
  if (submission.screen_condition === 'minor_scratches') {
    value -= rates.minor_scratches_deduction
    breakdown.push({
      reason: 'Screen minor scratches',
      amount: rates.minor_scratches_deduction,
    })
  }

  // Back glass (only if applicable)
  if (model.has_back_glass) {
    if (submission.back_glass_replaced) {
      value -= rates.back_glass_replaced_fixed_deduction
      breakdown.push({
        reason: 'Back glass previously replaced (water resistance affected)',
        amount: rates.back_glass_replaced_fixed_deduction,
      })
    }
    if (submission.back_glass_condition === 'cracked') {
      value -= rates.back_glass_replacement_cost
      breakdown.push({
        reason: 'Cracked back glass',
        amount: rates.back_glass_replacement_cost,
      })
    }
    if (submission.back_glass_condition === 'minor_scratches') {
      value -= rates.minor_scratches_deduction
      breakdown.push({
        reason: 'Back glass minor scratches',
        amount: rates.minor_scratches_deduction,
      })
    }
  }

  // Battery
  if (submission.battery_replaced) {
    value -= rates.battery_replaced_fixed_deduction
    breakdown.push({
      reason: 'Battery previously replaced (water resistance affected)',
      amount: rates.battery_replaced_fixed_deduction,
    })
  }
  if (submission.battery_health < 80) {
    const percentBelow = 80 - submission.battery_health
    const batteryDeduction = percentBelow * rates.battery_deduction_per_percent
    value -= batteryDeduction
    breakdown.push({
      reason: `Battery health ${submission.battery_health}% (${percentBelow}% below 80% threshold)`,
      amount: batteryDeduction,
    })
  }

  // Cameras
  if (submission.camera_glass_cracked) {
    value -= rates.camera_glass_cracked_deduction
    breakdown.push({
      reason: 'Camera glass cracked',
      amount: rates.camera_glass_cracked_deduction,
    })
  }
  if (!submission.front_camera_working) {
    value -= rates.front_camera_deduction
    breakdown.push({
      reason: 'Front camera not working',
      amount: rates.front_camera_deduction,
    })
  }
  for (const [camera, working] of Object.entries(submission.rear_cameras_status)) {
    if (!working) {
      value -= rates.rear_camera_deduction_per_camera
      breakdown.push({
        reason: `${camera} camera not working`,
        amount: rates.rear_camera_deduction_per_camera,
      })
    }
  }

  // Biometrics
  if (model.biometric === 'faceID' || model.biometric === 'both') {
    if (submission.face_id_working === false) {
      value -= rates.face_id_deduction
      breakdown.push({
        reason: 'Face ID not working',
        amount: rates.face_id_deduction,
      })
    }
  }
  if (model.biometric === 'fingerprint' || model.biometric === 'both') {
    if (submission.fingerprint_working === false) {
      value -= rates.fingerprint_deduction
      breakdown.push({
        reason: 'Fingerprint sensor not working',
        amount: rates.fingerprint_deduction,
      })
    }
  }

  // Body
  if (submission.body_condition === 'minor_scratches') {
    value -= rates.minor_scratches_deduction
    breakdown.push({
      reason: 'Minor body scratches',
      amount: rates.minor_scratches_deduction,
    })
  }
  if (submission.body_condition === 'dented') {
    value -= rates.dents_deduction
    breakdown.push({
      reason: 'Body dents',
      amount: rates.dents_deduction,
    })
  }

  const finalValue = Math.max(0, value)
  const percentage =
    model.base_trade_in_value > 0
      ? (finalValue / model.base_trade_in_value) * 100
      : 0

  const conditionScore: SwapConditionScore =
    percentage >= 95
      ? 'mint'
      : percentage >= 80
        ? 'good'
        : percentage >= 60
          ? 'fair'
          : 'poor'

  return { value: finalValue, breakdown, conditionScore }
}
