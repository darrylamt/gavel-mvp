import React from 'react'
import styled from 'styled-components'

interface TokenPricingCardProps {
  label: string
  tokens: number
  price: number
  highlight?: boolean
  isLoading?: boolean
  features?: string[]
  onBuy: () => void
}

const TokenPricingCard: React.FC<TokenPricingCardProps> = ({
  label,
  tokens,
  price,
  highlight = false,
  isLoading = false,
  features = [
    'Buy with Paystack',
    'Instant delivery',
    'Use for bidding',
    'Non-refundable',
  ],
  onBuy,
}) => {
  return (
    <StyledWrapper $highlight={highlight}>
      <div className="card">
        {highlight && <div className="badge">Most Popular</div>}
        <div className="pricing-block-content">
          <p className="pricing-plan">{label}</p>
          <div className="price-value">
            <p className="price-number">
              {tokens}
              <span className="price-currency">tokens</span>
            </p>
            <div className="price-period">/pay</div>
          </div>
          <div className="pricing-note">GHS {price}</div>
          <ul className="check-list" role="list">
            {features.map((feature, idx) => (
              <li key={idx} className="check-list-item">
                <CheckmarkIcon />
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={onBuy}
            disabled={isLoading}
            className="buy-button"
          >
            {isLoading ? 'Processing…' : 'Buy Tokens'}
          </button>
        </div>
      </div>
    </StyledWrapper>
  )
}

const CheckmarkIcon = () => (
  <svg
    version="1.0"
    preserveAspectRatio="xMidYMid meet"
    height={16}
    viewBox="0 0 30 30.000001"
    zoomAndPan="magnify"
    width={16}
    xmlns="http://www.w3.org/2000/svg"
    style={{ color: '#1a1a1a', flexShrink: 0 }}
  >
    <defs>
      <clipPath id="checkmark">
        <path fill="#1a1a1a" clipRule="nonzero" d="M 2.328125 4.222656 L 27.734375 4.222656 L 27.734375 24.542969 L 2.328125 24.542969 Z M 2.328125 4.222656" />
      </clipPath>
    </defs>
    <g clipPath="url(#checkmark)">
      <path
        fillRule="nonzero"
        fillOpacity={1}
        d="M 27.5 7.53125 L 24.464844 4.542969 C 24.15625 4.238281 23.65625 4.238281 23.347656 4.542969 L 11.035156 16.667969 L 6.824219 12.523438 C 6.527344 12.230469 6 12.230469 5.703125 12.523438 L 2.640625 15.539062 C 2.332031 15.84375 2.332031 16.335938 2.640625 16.640625 L 10.445312 24.324219 C 10.59375 24.472656 10.796875 24.554688 11.007812 24.554688 C 11.214844 24.554688 11.417969 24.472656 11.566406 24.324219 L 27.5 8.632812 C 27.648438 8.488281 27.734375 8.289062 27.734375 8.082031 C 27.734375 7.875 27.648438 7.679688 27.5 7.53125 Z M 27.5 7.53125"
        fill="#1a1a1a"
      />
    </g>
  </svg>
)

interface StyledWrapperProps {
  $highlight?: boolean
}

const StyledWrapper = styled.div<StyledWrapperProps>`
  /* Neo Brutalism pricing card - Black/White/Gray */
  .card {
    position: relative;
    width: 100%;
    max-width: 280px;
    background: ${props => (props.$highlight ? '#000000' : '#ffffff')};
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 2px solid #1a1a1a;
    box-shadow: 0.5rem 0.5rem 0px #1a1a1a;
    overflow: hidden;
    color: ${props => (props.$highlight ? '#ffffff' : '#1a1a1a')};
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0.75rem 0.75rem 0px #1a1a1a;
      transform: translate(-2px, -2px);
    }
  }

  .badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.5rem 0.75rem;
    border-radius: 2rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Card content */
  .pricing-block-content {
    display: flex;
    height: 100%;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: ${props => (props.$highlight ? '0.5rem' : '0')};
  }

  .pricing-plan {
    color: ${props => (props.$highlight ? '#ffffff' : '#1a1a1a')};
    font-size: 1.25rem;
    line-height: 1.25;
    font-weight: 700;
    margin: 0;
  }

  .price-value {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .price-number {
    font-size: 2rem;
    line-height: 1;
    font-weight: 700;
    margin: 0;
    color: ${props => (props.$highlight ? '#ffffff' : '#1a1a1a')};
  }

  .price-currency {
    font-size: 0.75rem;
    font-weight: 600;
    color: ${props => (props.$highlight ? '#aaaaaa' : '#666666')};
    text-transform: uppercase;
  }

  .price-period {
    font-size: 0.875rem;
    font-weight: 500;
    color: ${props => (props.$highlight ? '#aaaaaa' : '#666666')};
    margin: 0;
  }

  .pricing-note {
    font-size: 1.1rem;
    font-weight: 600;
    color: ${props => (props.$highlight ? '#ffffff' : '#1a1a1a')};
    margin: 0;
  }

  /* Checklist */
  .check-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0.5rem 0 1rem 0;
    padding: 0;
    list-style: none;
    flex-grow: 1;
  }

  .check-list-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: ${props => (props.$highlight ? '#dddddd' : '#333333')};
    margin: 0;
  }

  /* Buy Button */
  .buy-button {
    width: 100%;
    padding: 0.875rem 1rem;
    margin-top: 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    background: ${props => (props.$highlight ? '#ffffff' : '#1a1a1a')};
    color: ${props => (props.$highlight ? '#1a1a1a' : '#ffffff')};
    border: 2px solid ${props => (props.$highlight ? '#ffffff' : '#1a1a1a')};

    &:hover:not(:disabled) {
      box-shadow: inset 0 0 20px ${props => (props.$highlight ? '#00000010' : '#ffffff10')};
      transform: scale(1.02);
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
`

export default TokenPricingCard
