import type { SupabaseClient } from '@supabase/supabase-js'

export type DiscountCodeRow = {
  id: string
  code: string
  percent_off: number
  max_uses: number | null
  used_count: number
  ends_at: string | null
  is_active: boolean
}

export type DiscountResolution = {
  ok: boolean
  code: string
  row?: DiscountCodeRow
  error?: string
}

export function normalizeDiscountCode(value: string | null | undefined) {
  return String(value || '').trim().toUpperCase()
}

export function calculateDiscountAmount(subtotal: number, percentOff: number) {
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0
  const safePercent = Number.isFinite(percentOff) ? Math.min(100, Math.max(0, percentOff)) : 0
  return Number(((safeSubtotal * safePercent) / 100).toFixed(2))
}

export async function resolveDiscountCode(
  supabase: SupabaseClient,
  rawCode: string | null | undefined
): Promise<DiscountResolution> {
  const code = normalizeDiscountCode(rawCode)

  if (!code) {
    return { ok: false, code, error: 'Please enter a discount code.' }
  }

  const { data, error } = await supabase
    .from('discount_codes')
    .select('id, code, percent_off, max_uses, used_count, ends_at, is_active')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    return { ok: false, code, error: error.message }
  }

  const row = (data as DiscountCodeRow | null) ?? null

  if (!row || !row.is_active) {
    return { ok: false, code, error: 'This discount code is invalid or inactive.' }
  }

  if (row.ends_at && new Date(row.ends_at).getTime() <= Date.now()) {
    return { ok: false, code, error: 'This discount code has expired.' }
  }

  if (row.max_uses !== null && Number(row.used_count ?? 0) >= Number(row.max_uses ?? 0)) {
    return { ok: false, code, error: 'This discount code has reached its usage limit.' }
  }

  const percentOff = Number(row.percent_off)
  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
    return { ok: false, code, error: 'Discount configuration is invalid.' }
  }

  return { ok: true, code, row: { ...row, percent_off: percentOff } }
}
