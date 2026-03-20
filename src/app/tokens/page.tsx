'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import TokenFAQ from '@/components/tokens/TokenFAQ'
import TokenPricingCard from '@/components/tokens/TokenPricingCard'
import { Coins, ShieldCheck, Zap, RefreshCw } from 'lucide-react'

const PACKS = [
  {
    id: 'small',
    tokens: 10,
    price: 10,
    label: 'Starter',
    highlight: false,
    features: [
      'Instant delivery',
      'Use for bidding',
      'Refunded if you lose',
      'Secure Paystack checkout',
    ],
  },
  {
    id: 'medium',
    tokens: 30,
    price: 25,
    oldPrice: 30,
    label: 'Most Popular',
    highlight: true,
    features: [
      '30 tokens included',
      'Instant delivery',
      'Refunded if you lose',
      'Secure Paystack checkout',
    ],
  },
  {
    id: 'large',
    tokens: 70,
    price: 50,
    oldPrice: 70,
    label: 'Best Value',
    highlight: false,
    features: [
      'Best price per token',
      'Instant delivery',
      'Refunded if you lose',
      'Secure Paystack checkout',
    ],
  },
]

const TRUST_ITEMS = [
  { icon: RefreshCw, label: 'Auto-refunded if you lose' },
  { icon: Zap, label: 'Tokens delivered instantly' },
  { icon: ShieldCheck, label: 'Secure checkout via Paystack' },
]

export default function BuyTokensPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const buyTokens = async (packId: string) => {
    setLoading(packId)

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      alert('Please sign in to buy tokens')
      setLoading(null)
      return
    }

    const res = await fetch('/api/tokens/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pack: packId,
        user_id: auth.user.id,
        email: auth.user.email,
      }),
    })

    const data = await res.json()

    if (res.ok) {
      window.location.href = data.authorization_url
    } else {
      alert(data.error || 'Payment failed')
      setLoading(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-orange-100 mb-4">
          <Coins className="h-7 w-7 text-orange-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
          Buy Bidding Tokens
        </h1>
        <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
          Tokens are your bidding currency on Gavel. Place bids, compete in auctions,
          and win items — your tokens are refunded if you don&apos;t win.
        </p>

        {/* Trust badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
              <Icon className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Packs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16 max-w-4xl mx-auto">
        {PACKS.map((pack) => (
          <TokenPricingCard
            key={pack.id}
            label={pack.label}
            tokens={pack.tokens}
            price={pack.price}
            oldPrice={pack.oldPrice}
            highlight={pack.highlight}
            isLoading={loading === pack.id}
            features={pack.features}
            onBuy={() => buyTokens(pack.id)}
          />
        ))}
      </div>

      <TokenFAQ />

      {/* Footer note */}
      <div className="mt-10 text-center text-xs text-gray-400 space-y-1">
        <p>Payments are securely processed by Paystack.</p>
        <p>Tokens from losing bids are automatically refunded to your balance.</p>
      </div>
    </main>
  )
}
