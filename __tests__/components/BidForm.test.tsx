/**
 * @jest-environment jsdom
 *
 * Tests for BidForm component
 * Source: src/components/auction/BidForm.tsx
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import BidForm from '@/components/auction/BidForm'

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderForm(overrides: Partial<React.ComponentProps<typeof BidForm>> = {}) {
  const mockOnBidAmountChange = jest.fn()
  const mockOnSubmit = jest.fn()
  const defaults: React.ComponentProps<typeof BidForm> = {
    hasEnded: false,
    bidAmount: '',
    isPlacingBid: false,
    error: null,
    isLoggedIn: true,
    onBidAmountChange: mockOnBidAmountChange,
    onSubmit: mockOnSubmit,
  }
  const props = { ...defaults, ...overrides }
  const utils = render(<BidForm {...props} />)
  return { ...utils, mockOnSubmit, mockOnBidAmountChange }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BidForm', () => {
  it('renders null when auction has ended', () => {
    const { container } = renderForm({ hasEnded: true })
    expect(container.firstChild).toBeNull()
  })

  it('shows sign-in message when user is not logged in', () => {
    renderForm({ isLoggedIn: false })
    expect(screen.getByText(/sign in to place a bid/i)).toBeInTheDocument()
  })

  it('renders bid amount input when user is logged in', () => {
    renderForm()
    expect(screen.getByPlaceholderText(/enter amount in GHS/i)).toBeInTheDocument()
  })

  it('renders Place Bid button', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /place bid/i })).toBeInTheDocument()
  })

  it('shows loading state when isPlacingBid is true', () => {
    renderForm({ isPlacingBid: true })
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(/placing bid/i)).toBeInTheDocument()
  })

  it('disables input when isPlacingBid is true', () => {
    renderForm({ isPlacingBid: true })
    expect(screen.getByPlaceholderText(/enter amount in GHS/i)).toBeDisabled()
  })

  it('displays error message when error is provided', () => {
    renderForm({ error: 'Bid must be higher than current price' })
    expect(screen.getByText('Bid must be higher than current price')).toBeInTheDocument()
  })

  it('does not show error section when error is null', () => {
    renderForm({ error: null })
    expect(screen.queryByText(/must be higher/i)).not.toBeInTheDocument()
  })

  it('calls onBidAmountChange when input value changes', () => {
    const { mockOnBidAmountChange } = renderForm()
    const input = screen.getByPlaceholderText(/enter amount in GHS/i)
    fireEvent.change(input, { target: { value: '500' } })
    expect(mockOnBidAmountChange).toHaveBeenCalledWith('500')
  })

  it('calls onSubmit when Place Bid button is clicked', () => {
    const { mockOnSubmit } = renderForm({ bidAmount: '500' })
    fireEvent.click(screen.getByRole('button', { name: /place bid/i }))
    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it('shows token deduction notice', () => {
    renderForm()
    expect(screen.getByText(/deducts tokens/i)).toBeInTheDocument()
  })

  it('shows minimum increment when provided', () => {
    renderForm({ minIncrement: 100 })
    expect(screen.getByText(/minimum increment.*100/i)).toBeInTheDocument()
  })

  it('shows allowed increment range when both min and max provided', () => {
    renderForm({ minIncrement: 50, maxIncrement: 500 })
    expect(screen.getByText(/allowed increment/i)).toBeInTheDocument()
    expect(screen.getByText(/50/)).toBeInTheDocument()
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('does not show increment info when minIncrement is 0', () => {
    renderForm({ minIncrement: 0 })
    expect(screen.queryByText(/increment/i)).not.toBeInTheDocument()
  })

  it('reflects bidAmount value in input', () => {
    renderForm({ bidAmount: '350' })
    const input = screen.getByPlaceholderText(/enter amount in GHS/i) as HTMLInputElement
    expect(input.value).toBe('350')
  })
})
