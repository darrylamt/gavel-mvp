/**
 * @jest-environment jsdom
 *
 * Tests for AuctionCard component
 * Source: src/components/auction/AuctionCard.tsx
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// ── Module mocks ──────────────────────────────────────────────────────────────
const mockToggleStarred = jest.fn()
const mockIsStarred = jest.fn().mockReturnValue(false)

jest.mock('@/hooks/useStarredAuctions', () => ({
  useStarredAuctions: () => ({
    isStarred: mockIsStarred,
    toggleStarred: mockToggleStarred,
  }),
}))

jest.mock('./SharedTickProvider', () => ({
  useSharedTick: () => ({ nowMs: Date.now() }),
}), { virtual: true })

// Use the actual module path as the component will import it
jest.mock('@/components/auction/SharedTickProvider', () => ({
  useSharedTick: () => ({ nowMs: Date.now() }),
}))

jest.mock('@/lib/engagement', () => ({
  getOrCreateViewerKey: jest.fn().mockReturnValue('viewer-key-123'),
}))

jest.mock('@/lib/seo', () => ({
  buildAuctionPath: jest.fn((id: string, title: string) => `/auction/${id}`),
}))

jest.mock('@/lib/supabaseClient', () => ({
  getSessionHeaders: jest.fn().mockResolvedValue({ Authorization: 'Bearer test' }),
}))

jest.mock('@/lib/auctionImages', () => ({
  normalizeAuctionImageUrls: jest.fn((images: unknown, imageUrl: unknown) =>
    imageUrl ? [imageUrl] : []
  ),
}))

jest.mock('next/link', () => {
  const MockLink = ({ href, children, onClick, className }: {
    href: string
    children: React.ReactNode
    onClick?: () => void
    className?: string
  }) => (
    <a href={href} onClick={onClick} className={className} data-testid="auction-card-link">
      {children}
    </a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('lucide-react', () => ({
  Heart: ({ className }: { className: string }) => <svg data-testid="heart-icon" className={className} />,
  Info: () => <svg data-testid="info-icon" />,
  Lock: () => <svg data-testid="lock-icon" />,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────
const NOW = Date.now()
const future = (ms = 120_000) => new Date(NOW + ms).toISOString()
const past = (ms = 60_000) => new Date(NOW - ms).toISOString()

function renderCard(overrides: Partial<React.ComponentProps<typeof import('@/components/auction/AuctionCard').default>> = {}) {
  const defaultProps = {
    id: 'auction-1',
    title: 'Test iPhone 15 Pro',
    currentPrice: 1000,
    endsAt: future(),
    imageUrl: 'https://example.com/image.jpg',
  }
  const props = { ...defaultProps, ...overrides }
  const AuctionCard = require('@/components/auction/AuctionCard').default
  return render(<AuctionCard {...props} />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuctionCard', () => {
  beforeEach(() => {
    mockIsStarred.mockReturnValue(false)
    mockToggleStarred.mockClear()
  })

  it('renders the auction title', () => {
    renderCard()
    expect(screen.getByText('Test iPhone 15 Pro')).toBeInTheDocument()
  })

  it('renders the current price formatted with GHS', () => {
    renderCard({ currentPrice: 1500 })
    expect(screen.getByText('GHS 1,500')).toBeInTheDocument()
  })

  it('shows "Live" badge for active auction', () => {
    renderCard({ endsAt: future(120_000), startsAt: past(60_000) })
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('shows "Scheduled" badge when auction has not started', () => {
    renderCard({ endsAt: future(3_600_000), startsAt: future(600_000) })
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('shows "Ended" badge for past auction', () => {
    renderCard({ endsAt: past(60_000) })
    expect(screen.getByText('Ended')).toBeInTheDocument()
  })

  it('renders the auction image when imageUrl is provided', () => {
    renderCard({ imageUrl: 'https://example.com/image.jpg' })
    const img = screen.getByRole('img', { name: 'Test iPhone 15 Pro' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('shows "No image" placeholder when imageUrl is null', () => {
    renderCard({ imageUrl: null, images: null })
    expect(screen.getByText('No image')).toBeInTheDocument()
  })

  it('renders starting price when provided', () => {
    renderCard({ startingPrice: 500 })
    expect(screen.getByText('Starting: GHS 500')).toBeInTheDocument()
  })

  it('shows bidder count for live auction', () => {
    renderCard({ bidderCount: 5, startsAt: past(60_000) })
    expect(screen.getByText(/bidder/i)).toBeInTheDocument()
    // Bidder count text contains "5 bidder(s)"
    const bidderEl = screen.getByText(/bidder/i)
    expect(bidderEl.closest('span')?.textContent).toMatch(/5/)
  })

  it('shows watcher count', () => {
    renderCard({ watcherCount: 12, startsAt: past(60_000) })
    expect(screen.getByText(/watching/i)).toBeInTheDocument()
    const watcherEl = screen.getByText(/watching/i)
    expect(watcherEl.closest('span')?.textContent).toMatch(/12/)
  })

  it('shows Reserve badge when reservePrice is set', () => {
    renderCard({ reservePrice: 800 })
    expect(screen.getByText('Reserve')).toBeInTheDocument()
  })

  it('shows Private badge and lock icon when isPrivate is true', () => {
    renderCard({ isPrivate: true })
    expect(screen.getByText('Private')).toBeInTheDocument()
  })

  it('renders heart button for non-ended auction', () => {
    renderCard({ endsAt: future() })
    expect(screen.getByRole('button', { name: /starred/i })).toBeInTheDocument()
  })

  it('does not render heart button for ended auction', () => {
    renderCard({ endsAt: past() })
    expect(screen.queryByRole('button', { name: /starred/i })).not.toBeInTheDocument()
  })

  it('heart button shows filled state when starred', () => {
    mockIsStarred.mockReturnValue(true)
    renderCard()
    const heartIcon = screen.getByTestId('heart-icon')
    // SVG elements use getAttribute('class') since .className is SVGAnimatedString in jsdom
    expect(heartIcon.getAttribute('class')).toContain('fill-red-500')
  })

  it('calls toggleStarred when heart button is clicked', () => {
    renderCard()
    const heartBtn = screen.getByRole('button', { name: /starred/i })
    fireEvent.click(heartBtn)
    expect(mockToggleStarred).toHaveBeenCalledWith('auction-1')
  })

  it('renders min increment info when provided', () => {
    renderCard({ minIncrement: 50 })
    expect(screen.getByText(/Min \+50/)).toBeInTheDocument()
  })

  it('renders max increment info when provided', () => {
    renderCard({ maxIncrement: 500 })
    expect(screen.getByText(/Max \+500/)).toBeInTheDocument()
  })

  it('links to the auction detail page', () => {
    renderCard({ id: 'auction-1', title: 'Test iPhone 15 Pro' })
    const link = screen.getByTestId('auction-card-link')
    expect(link).toHaveAttribute('href', '/auction/auction-1')
  })
})
