// TypeScript types for the Phone Swap feature

export type SwapPhoneModel = {
  id: string
  brand: string
  model: string
  release_year: number
  back_material: 'glass' | 'plastic' | 'metal' | 'ceramic'
  rear_cameras: string[] // e.g. ["Wide", "Ultra Wide", "Telephoto"]
  biometric: 'faceID' | 'fingerprint' | 'both' | 'none'
  water_resistance_rating: string | null
  has_back_glass: boolean
  base_trade_in_value: number
  is_active: boolean
  created_at: string
}

export type SwapDeductionRates = {
  id: string
  model_id: string
  screen_replacement_cost: number
  screen_replaced_fixed_deduction: number
  back_glass_replacement_cost: number
  back_glass_replaced_fixed_deduction: number
  battery_deduction_per_percent: number
  battery_replaced_fixed_deduction: number
  camera_glass_cracked_deduction: number
  front_camera_deduction: number
  rear_camera_deduction_per_camera: number
  face_id_deduction: number
  fingerprint_deduction: number
  minor_scratches_deduction: number
  dents_deduction: number
  created_at: string
}

export type SwapInventoryItem = {
  id: string
  model_id: string
  storage: string
  color: string
  condition: 'new' | 'used_excellent' | 'used_good' | 'used_fair'
  price: number
  quantity: number
  is_active: boolean
  created_at: string
  // joined
  swap_phone_models?: SwapPhoneModel
}

export type SwapConditionScore = 'mint' | 'good' | 'fair' | 'poor'

export type SwapStatus =
  | 'pending_deposit'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'appointment_booked'
  | 'completed'
  | 'cancelled'
  | 'expired'

export type SwapSubmission = {
  id: string
  user_id: string

  model_id: string
  storage: string
  color: string

  battery_health: number
  battery_replaced: boolean

  screen_condition: 'perfect' | 'minor_scratches' | 'cracked'
  screen_replaced: boolean

  back_glass_condition: 'perfect' | 'minor_scratches' | 'cracked' | null
  back_glass_replaced: boolean | null

  camera_glass_cracked: boolean
  front_camera_working: boolean
  rear_cameras_status: Record<string, boolean>

  face_id_working: boolean | null
  fingerprint_working: boolean | null

  body_condition: 'perfect' | 'minor_scratches' | 'cracked'

  other_issues: string | null
  water_damage: boolean

  photos: string[]
  battery_health_screenshot: string

  calculated_trade_in_value: number
  deduction_breakdown: DeductionBreakdownItem[]
  condition_score: SwapConditionScore

  desired_inventory_id: string | null

  deposit_amount: number
  deposit_paid: boolean
  deposit_payment_reference: string | null

  status: SwapStatus

  reviewed_by: string | null
  rejection_reason: string | null
  approved_at: string | null
  offer_expires_at: string | null
  account_flagged: boolean
  flag_reason: string | null

  arrival_recalculated: boolean
  arrival_new_value: number | null
  arrival_decision: 'accepted' | 'cancelled' | null

  created_at: string

  // joined
  swap_phone_models?: SwapPhoneModel
  swap_inventory?: SwapInventoryItem
}

export type SwapAvailableSlot = {
  id: string
  slot_datetime: string
  is_booked: boolean
  created_at: string
}

export type SwapAppointment = {
  id: string
  submission_id: string
  user_id: string
  slot_id: string
  reminder_sent: boolean
  created_at: string
  // joined
  swap_available_slots?: SwapAvailableSlot
  swap_submissions?: SwapSubmission
}

// Valuation types
export type DeductionBreakdownItem = {
  reason: string
  amount: number
}

export type ValuationResult = {
  value: number
  breakdown: DeductionBreakdownItem[]
  conditionScore: SwapConditionScore
}

// Input types for the submission form
export type SwapSubmissionInput = {
  model_id: string
  storage: string
  color: string

  battery_health: number
  battery_replaced: boolean

  screen_condition: 'perfect' | 'minor_scratches' | 'cracked'
  screen_replaced: boolean

  back_glass_condition: 'perfect' | 'minor_scratches' | 'cracked' | null
  back_glass_replaced: boolean | null

  camera_glass_cracked: boolean
  front_camera_working: boolean
  rear_cameras_status: Record<string, boolean>

  face_id_working: boolean | null
  fingerprint_working: boolean | null

  body_condition: 'perfect' | 'minor_scratches' | 'cracked'
  other_issues: string | null
  water_damage: boolean

  photos: string[]
  battery_health_screenshot: string

  desired_inventory_id: string | null
}

// Upgrade suggestion
export type SwapUpgradeSuggestion = {
  item: SwapInventoryItem
  topUpAmount: number
  label: 'Budget Upgrade' | 'Popular Choice' | 'Best Upgrade'
}

// Admin stats
export type SwapStats = {
  pending_review: number
  approved: number
  appointments_today: number
  completed_this_month: number
}
