export const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Volta',
  'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo', 'Bono',
  'Bono East', 'Ahafo', 'Western North', 'Oti', 'Savannah', 'North East',
]

export const SQFT_PER_PLOT = 10000
export const SQM_PER_PLOT = 929.03

export function calculateSizes(value: number, unit: 'plots' | 'sqft' | 'sqm') {
  switch (unit) {
    case 'plots':
      return { plots: value, sqft: value * SQFT_PER_PLOT, sqm: Math.round(value * SQM_PER_PLOT * 100) / 100 }
    case 'sqft':
      return { plots: Math.round((value / SQFT_PER_PLOT) * 1000) / 1000, sqft: value, sqm: Math.round(value * 0.092903 * 100) / 100 }
    case 'sqm':
      return { plots: Math.round((value / SQM_PER_PLOT) * 1000) / 1000, sqft: Math.round(value * 10.7639 * 100) / 100, sqm: value }
  }
}

export function getPropertyCommission(price: number): number {
  if (price < 50000) return 0.05
  if (price < 200000) return 0.03
  return 0.02
}

export function formatGhsPrice(amount: number): string {
  return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export const PROPERTY_AMENITIES = [
  'Parking / Garage', 'Generator / Inverter', 'Borehole / Well',
  'Swimming Pool', 'Security / Gated', 'Boys Quarters',
  'Air Conditioning', 'DSTV / Fibre', 'Water Meter (GWCL)',
]

export const TITLE_TYPE_LABELS: Record<string, string> = {
  freehold: 'Freehold',
  leasehold: 'Leasehold',
  stool_land: 'Stool Land',
  vested_land: 'Vested Land',
  other: 'Other',
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  land: 'Land',
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
}
