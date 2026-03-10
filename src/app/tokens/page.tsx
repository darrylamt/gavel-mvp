'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import TokenFAQ from '@/components/tokens/TokenFAQ'
import TokenPricingCard from '@/components/tokens/TokenPricingCard'

const PACKS = [
  {
    id: 'small',
    tokens: 10,
    price: 10,
    label: 'Starter',
    highlight: false,
    features: [
      'Buy with Paystack',
      'Instant delivery',
      'Use for bidding',
      'Refunded if you lose',
    ],
  },
  {
    id: 'medium',
    tokens: 30,
    price: 25,
    label: 'Most Popular',
    highlight: true,
    features: [
      '30 tokens included',
      'Buy with Paystack',
      'Instant delivery',
      'Refunded if you lose',
    ],
  },
  {
    id: 'large',
    tokens: 70,
    price: 50,
    label: 'Best Value',
    highlight: false,
    features: [
      'Buy with Paystack',
      'Instant delivery',
      'Use for bidding',
      'Refunded if you lose',
    ],
  },
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
    <main className="max-w-6xl mx-auto px-6 py-12">
      {/* HEADER */}
      <div className="text-center max-w-xl mx-auto mb-12">
        <h1 className="text-3xl font-extrabold mb-3">
          Buy Tokens
        </h1>
        <p className="text-gray-600">
          Tokens are used to place bids on auctions.
          More tokens means more chances to win.
        </p>
        <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          Tokens refunded if you don't win
        </p>
      </div>

      {/* PACKS */}
      <div className="grid md:grid-cols-3 gap-8 justify-items-center mb-12">
        {PACKS.map((pack) => (
          <TokenPricingCard
            key={pack.id}
            label={pack.label}
            tokens={pack.tokens}
            price={pack.price}
            highlight={pack.highlight}
            isLoading={loading === pack.id}
            features={pack.features}
            onBuy={() => buyTokens(pack.id)}
          />
        ))}
      </div>

      <TokenFAQ />

      {/* FOOTER INFO */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>Payments are securely processed by Paystack.</p>
        <p className="mt-1">
          Tokens used for losing bids are automatically refunded.
        </p>
      </div>
    </main>
  )
}
