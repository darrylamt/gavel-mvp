import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jest-environment-node',
  testMatch: [
    '<rootDir>/__tests__/unit/**/*.test.ts',
    '<rootDir>/__tests__/api/**/*.test.ts',
    '<rootDir>/__tests__/components/**/*.test.tsx',
  ],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
  ],
  // Collect coverage only for files that have corresponding tests
  collectCoverageFrom: [
    'src/lib/discounts.ts',
    'src/lib/buyNowPricing.ts',
    'src/lib/auctionPaymentCandidate.ts',
    'src/app/api/bids/route.ts',
    'src/app/api/paystack/webhook/route.ts',
    'src/app/api/paystack/approve-transfer/route.ts',
    'src/app/api/payouts/auto-release/route.ts',
    'src/app/api/payouts/hold/route.ts',
    'src/app/api/payouts/release/route.ts',
    'src/app/api/search/route.ts',
    'src/app/api/arkesel/dispatch/route.ts',
    'src/app/api/ai/describe-product/route.ts',
    'src/app/api/tokens/init/route.ts',
    'src/app/api/tokens/verify/route.ts',
    'src/app/api/delivery/create/route.ts',
    'src/components/auction/AuctionCard.tsx',
    'src/components/auction/BidForm.tsx',
    'src/components/tokens/TokenPricingCard.tsx',
  ],
  coverageThreshold: {
    global: { branches: 60, functions: 65, lines: 70, statements: 70 },
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
}

export default createJestConfig(config)
