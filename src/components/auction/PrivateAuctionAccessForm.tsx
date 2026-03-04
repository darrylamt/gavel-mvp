'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

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

      if (!response.ok) {
        throw new Error(data.error || 'Invalid access code')
      }

      // Store access in sessionStorage
      const accessKey = `private_auction_${data.auction_id}`
      sessionStorage.setItem(accessKey, 'granted')

      // Redirect to auction
      router.push(`/auctions/${data.auction_id}/${data.slug}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-8">
      <div className="flex items-start gap-3 mb-4">
        <Lock className="text-purple-600 mt-1" size={20} />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Access Private Auction</h2>
          <p className="text-sm text-gray-600">Have an access code? Enter it below to view a private auction.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g., XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            className="flex-1 px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono tracking-wider"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? 'Validating...' : 'Enter'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </form>
    </div>
  )
}
