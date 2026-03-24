/**
 * @jest-environment jsdom
 *
 * Tests for TokenPricingCard component
 * Source: src/components/tokens/TokenPricingCard.tsx
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TokenPricingCard from '@/components/tokens/TokenPricingCard'

jest.mock('lucide-react', () => ({
  Check: ({ className }: { className: string }) => <svg data-testid="check-icon" className={className} />,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderCard(overrides: Partial<React.ComponentProps<typeof TokenPricingCard>> = {}) {
  const mockOnBuy = jest.fn()
  const defaults: React.ComponentProps<typeof TokenPricingCard> = {
    label: 'Starter',
    tokens: 10,
    price: 10,
    onBuy: mockOnBuy,
  }
  const props = { ...defaults, ...overrides }
  const utils = render(<TokenPricingCard {...props} />)
  return { ...utils, mockOnBuy }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TokenPricingCard', () => {
  it('renders the label', () => {
    renderCard({ label: 'Starter' })
    expect(screen.getByText('Starter')).toBeInTheDocument()
  })

  it('renders the token count', () => {
    renderCard({ tokens: 50 })
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('tokens')).toBeInTheDocument()
  })

  it('renders the price', () => {
    renderCard({ price: 25 })
    expect(screen.getByText('₵25')).toBeInTheDocument()
  })

  it('renders "Get N Tokens" button text', () => {
    renderCard({ tokens: 30 })
    expect(screen.getByRole('button', { name: /get 30 tokens/i })).toBeInTheDocument()
  })

  it('calls onBuy when button is clicked', () => {
    const { mockOnBuy } = renderCard()
    fireEvent.click(screen.getByRole('button'))
    expect(mockOnBuy).toHaveBeenCalledTimes(1)
  })

  it('disables button when isLoading is true', () => {
    renderCard({ isLoading: true })
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows processing spinner text when isLoading is true', () => {
    renderCard({ isLoading: true })
    expect(screen.getByText(/processing/i)).toBeInTheDocument()
  })

  it('shows "Most Popular" banner when highlight is true', () => {
    renderCard({ highlight: true })
    expect(screen.getByText(/most popular/i)).toBeInTheDocument()
  })

  it('does not show "Most Popular" banner when highlight is false', () => {
    renderCard({ highlight: false })
    expect(screen.queryByText(/most popular/i)).not.toBeInTheDocument()
  })

  it('shows old price with strikethrough when hasDiscount', () => {
    renderCard({ price: 90, oldPrice: 110 })
    expect(screen.getByText('₵110')).toBeInTheDocument()
    const oldPriceEl = screen.getByText('₵110')
    expect(oldPriceEl.className).toContain('line-through')
  })

  it('shows savings percentage when old price is provided', () => {
    renderCard({ price: 90, oldPrice: 100 })
    expect(screen.getByText(/save 10%/i)).toBeInTheDocument()
  })

  it('does not show savings badge when no old price', () => {
    renderCard({ price: 90 })
    expect(screen.queryByText(/save/i)).not.toBeInTheDocument()
  })

  it('does not show savings badge when old price equals current price', () => {
    renderCard({ price: 90, oldPrice: 90 })
    expect(screen.queryByText(/save/i)).not.toBeInTheDocument()
  })

  it('renders features list with check icons', () => {
    renderCard({ features: ['Bid on any auction', 'No expiry'] })
    expect(screen.getByText('Bid on any auction')).toBeInTheDocument()
    expect(screen.getByText('No expiry')).toBeInTheDocument()
    expect(screen.getAllByTestId('check-icon')).toHaveLength(2)
  })

  it('renders empty features list by default', () => {
    renderCard()
    expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument()
  })
})
