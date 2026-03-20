import React from 'react'
import { Check } from 'lucide-react'

interface TokenPricingCardProps {
  label: string
  tokens: number
  price: number
  oldPrice?: number
  highlight?: boolean
  isLoading?: boolean
  features?: string[]
  onBuy: () => void
}

const TokenPricingCard: React.FC<TokenPricingCardProps> = ({
  label,
  tokens,
  price,
  oldPrice,
  highlight = false,
  isLoading = false,
  features = [],
  onBuy,
}) => {
  const hasDiscount = typeof oldPrice === 'number' && oldPrice > price
  const savingsPercent = hasDiscount ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0

  return (
    <div className={`relative flex flex-col rounded-2xl border bg-white overflow-hidden transition-all duration-200 ${
      highlight
        ? 'border-orange-400 shadow-xl shadow-orange-100 scale-[1.02]'
        : 'border-gray-100 shadow-sm hover:shadow-md'
    }`}>
      {highlight && (
        <div className="bg-orange-500 text-white text-xs font-bold text-center py-2 tracking-wide uppercase">
          Most Popular
        </div>
      )}

      <div className="p-6 sm:p-7 flex flex-col flex-1">
        {/* Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
            highlight ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {label}
          </span>
          {hasDiscount && (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
              Save {savingsPercent}%
            </span>
          )}
        </div>

        {/* Token count — big */}
        <div className="mb-1">
          <div className="flex items-end gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-none">{tokens}</span>
            <span className="text-base font-semibold text-gray-400 mb-1">tokens</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-5">
          <span className={`text-2xl font-bold ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>
            ₵{price}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">₵{oldPrice}</span>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2.5 mb-6 flex-1">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${highlight ? 'text-orange-500' : 'text-green-500'}`} />
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={onBuy}
          disabled={isLoading}
          className={`w-full rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
            highlight
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200'
              : 'bg-gray-900 text-white hover:bg-black'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Processing…
            </span>
          ) : (
            `Get ${tokens} Tokens`
          )}
        </button>
      </div>
    </div>
  )
}

export default TokenPricingCard
