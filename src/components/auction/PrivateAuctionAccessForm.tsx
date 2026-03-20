'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ArrowRight } from 'lucide-react'

export default function PrivateAuctionAccessForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auctions/access-code-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Invalid access code')
      sessionStorage.setItem(`private_auction_${data.auction_id}`, 'granted')
      router.push(`/auctions/${data.auction_id}/${data.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Lock className="h-4 w-4 text-gray-600" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Access a Private Auction</h2>
          <p className="text-xs text-gray-500 mt-0.5">Have an invite code? Enter it to view a private listing.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g., XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null) }}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>Enter <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </button>
        </div>

        {error && (
          <p className="mt-2.5 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
