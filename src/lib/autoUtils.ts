export function getAutoCommission(price: number): number {
  if (price < 20000) return 0.05
  if (price < 100000) return 0.03
  return 0.02
}

export const AUTO_MAKES = [
  'Toyota', 'Mercedes-Benz', 'Honda', 'Hyundai', 'Ford', 'Nissan',
  'KIA', 'BMW', 'Lexus', 'Land Rover', 'Mitsubishi', 'Volkswagen',
  'Chevrolet', 'Isuzu', 'Peugeot', 'Renault', 'Opel', 'Other',
]

export const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'suv', label: 'SUV' },
  { value: 'truck', label: 'Truck' },
  { value: 'bus', label: 'Bus' },
  { value: 'motorbike', label: 'Motorbike' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
] as const

export const ENGINE_SIZES = [
  '1.0L', '1.2L', '1.4L', '1.6L', '1.8L', '2.0L',
  '2.4L', '2.5L', '3.0L', '3.5L', '4.0L', 'Other',
]

export const CONDITION_CONFIG = {
  brand_new: { label: 'Brand New', color: 'bg-emerald-100 text-emerald-700' },
  foreign_used: { label: 'Foreign Used', color: 'bg-blue-100 text-blue-700' },
  ghana_used: { label: 'Ghana Used', color: 'bg-orange-100 text-orange-700' },
}

export function formatGhsPrice(amount: number): string {
  return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatMileage(km: number): string {
  return `${km.toLocaleString()} km`
}
