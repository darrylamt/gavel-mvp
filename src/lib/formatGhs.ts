/**
 * Format a GHS amount with 2 decimal places and thousand separators.
 * Single source of truth for all price display across the app.
 */
export function formatGhs(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0)
  if (!isFinite(num)) return 'GHS 0.00'
  return `GHS ${num.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
