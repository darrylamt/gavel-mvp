const BASELINE_COMMISSION_PERCENT = 10

type DiscountInput = {
  price: number
  sellerBasePrice?: number | null
  commissionRate?: number | null
}

export type BuyNowDiscountBreakdown = {
  currentPrice: number
  previousPrice: number | null
  discountAmount: number
  discountPercent: number
  hasDiscount: boolean
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

export function formatGhsAmount(value: number) {
  return Number(value).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getBuyNowDiscountBreakdown({ price, sellerBasePrice, commissionRate }: DiscountInput): BuyNowDiscountBreakdown {
  const currentPrice = roundCurrency(Math.max(0, toFiniteNumber(price) ?? 0))

  let basePrice = toFiniteNumber(sellerBasePrice)
  const rate = toFiniteNumber(commissionRate)

  if (!(basePrice !== null && basePrice > 0) && rate !== null && rate >= 0) {
    const divisor = 1 + rate / 100
    if (divisor > 0) {
      basePrice = currentPrice / divisor
    }
  }

  if (!(basePrice !== null && basePrice > 0)) {
    return {
      currentPrice,
      previousPrice: null,
      discountAmount: 0,
      discountPercent: 0,
      hasDiscount: false,
    }
  }

  const previousPrice = roundCurrency(basePrice * (1 + BASELINE_COMMISSION_PERCENT / 100))
  const discountAmount = roundCurrency(previousPrice - currentPrice)

  if (discountAmount <= 0) {
    return {
      currentPrice,
      previousPrice: null,
      discountAmount: 0,
      discountPercent: 0,
      hasDiscount: false,
    }
  }

  const discountPercent = previousPrice > 0
    ? roundCurrency((discountAmount / previousPrice) * 100)
    : 0

  return {
    currentPrice,
    previousPrice,
    discountAmount,
    discountPercent,
    hasDiscount: true,
  }
}
