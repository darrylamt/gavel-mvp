'use client'

import { supabase } from '@/lib/supabaseClient'

export default function TokensPage() {
  // 🔹 THIS FUNCTION GOES AT THE TOP OF THE COMPONENT
  const buy = async (pack: 'small' | 'medium' | 'large') => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      alert('Please log in')
      return
    }

    const res = await fetch('/api/tokens/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pack,
        user_id: data.user.id,
        email: data.user.email,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      alert(json.error)
      return
    }

    // 🔹 Redirect to Paystack
    window.location.href = json.authorization_url
  }

  // 🔹 JSX STARTS HERE
  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Buy Tokens
      </h1>

      <p className="text-sm text-gray-600 mb-6">
        Tokens are required to place bids. Each bid consumes
        one token. Tokens are non-refundable.
      </p>

      <div className="space-y-4">
        {/* SMALL PACK */}
        <div className="border p-4 rounded">
          <h2 className="font-semibold">10 Tokens</h2>
          <p className="text-sm text-gray-600">GHS 10</p>
          <button
            onClick={() => buy('small')}
            className="mt-2 bg-black text-white px-4 py-2 w-full"
          >
            Buy
          </button>
        </div>

        {/* MEDIUM PACK */}
        <div className="border p-4 rounded">
          <h2 className="font-semibold">50 Tokens</h2>
          <p className="text-sm text-gray-600">GHS 45</p>
          <button
            onClick={() => buy('medium')}
            className="mt-2 bg-black text-white px-4 py-2 w-full"
          >
            Buy
          </button>
        </div>

        {/* LARGE PACK */}
        <div className="border p-4 rounded">
          <h2 className="font-semibold">100 Tokens</h2>
          <p className="text-sm text-gray-600">GHS 80</p>
          <button
            onClick={() => buy('large')}
            className="mt-2 bg-black text-white px-4 py-2 w-full"
          >
            Buy
          </button>
        </div>
      </div>
    </main>
  )
}
