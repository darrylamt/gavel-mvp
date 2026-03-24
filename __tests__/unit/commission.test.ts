/**
 * Tests commission formulas used in:
 *  - src/app/api/auction-payments/verify/route.ts  (lines ~156-161)
 *  - src/app/api/shop-payments/verify/route.ts     (lines ~319-321)
 *
 * These formulas are inlined in the route handlers, not in a shared lib.
 * We replicate them here to document and verify correctness.
 */

const AUCTION_COMMISSION_RATE = 0.10

/**
 * Auction commission: 10% of the gross payment.
 * Seller receives 90% after commission.
 */
function calcAuctionCommission(grossAmount: number) {
  const commissionAmount = grossAmount * AUCTION_COMMISSION_RATE
  const payoutAmount = grossAmount * (1 - AUCTION_COMMISSION_RATE)
  return { commissionAmount, payoutAmount }
}

/**
 * Shop commission: price is already marked up 10% from seller's base.
 * To reverse: sellerPayout = grossAmount / 1.1, commission = grossAmount - payout.
 */
function calcShopCommission(grossAmount: number) {
  const payoutAmount = grossAmount / 1.1
  const commissionAmount = grossAmount - payoutAmount
  return { commissionAmount, payoutAmount }
}

describe('Auction commission calculation', () => {
  it('calculates 10% commission on GHS 1000', () => {
    const { commissionAmount, payoutAmount } = calcAuctionCommission(1000)
    expect(commissionAmount).toBe(100)
    expect(payoutAmount).toBe(900)
  })

  it('calculates 10% commission on GHS 50', () => {
    const { commissionAmount, payoutAmount } = calcAuctionCommission(50)
    expect(commissionAmount).toBe(5)
    expect(payoutAmount).toBe(45)
  })

  it('commission + payout always equals gross', () => {
    const amounts = [99.99, 1234.56, 0.01, 10000]
    for (const gross of amounts) {
      const { commissionAmount, payoutAmount } = calcAuctionCommission(gross)
      expect(commissionAmount + payoutAmount).toBeCloseTo(gross, 10)
    }
  })

  it('payout is exactly 90% of gross', () => {
    const gross = 777
    const { payoutAmount } = calcAuctionCommission(gross)
    expect(payoutAmount).toBe(gross * 0.9)
  })

  it('handles GHS 0', () => {
    const { commissionAmount, payoutAmount } = calcAuctionCommission(0)
    expect(commissionAmount).toBe(0)
    expect(payoutAmount).toBe(0)
  })
})

describe('Shop commission calculation (reverse markup)', () => {
  it('removes 10% markup: GHS 110 gross → GHS 100 payout, GHS 10 commission', () => {
    const { payoutAmount, commissionAmount } = calcShopCommission(110)
    expect(payoutAmount).toBeCloseTo(100, 5)
    expect(commissionAmount).toBeCloseTo(10, 5)
  })

  it('removes 10% markup: GHS 55 gross → ~GHS 50 payout', () => {
    const { payoutAmount } = calcShopCommission(55)
    expect(payoutAmount).toBeCloseTo(50, 5)
  })

  it('commission + payout always equals gross', () => {
    const amounts = [110, 220, 55, 99.99]
    for (const gross of amounts) {
      const { commissionAmount, payoutAmount } = calcShopCommission(gross)
      expect(commissionAmount + payoutAmount).toBeCloseTo(gross, 10)
    }
  })

  it('payout is exactly gross / 1.1', () => {
    const gross = 550
    const { payoutAmount } = calcShopCommission(gross)
    expect(payoutAmount).toBeCloseTo(gross / 1.1, 8)
  })

  it('commission is approximately 9.09% of gross (effective rate after markup)', () => {
    // 10/110 = 9.0909...%
    const gross = 1100
    const { commissionAmount } = calcShopCommission(gross)
    expect(commissionAmount / gross).toBeCloseTo(1 / 11, 5)
  })
})
