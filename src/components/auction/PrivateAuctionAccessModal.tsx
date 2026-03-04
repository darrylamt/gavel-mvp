'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface PrivateAuctionAccessModalProps {
  auctionId: string
  auctionTitle: string
  isOpen: boolean
  onClose: () => void
  onAccessGranted: (viewerKey: string) => void
}

export default function PrivateAuctionAccessModal({
  auctionId,
  auctionTitle,
  isOpen,
  onClose,
  onAccessGranted,
}: PrivateAuctionAccessModalProps) {
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auctions/validate-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId,
          accessCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate access code')
      }

      // Store access grant in sessionStorage
      const accessKey = `private_auction_${auctionId}`
      sessionStorage.setItem(accessKey, data.viewerKey)
      
      setAccessCode('')
      onAccessGranted(data.viewerKey)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Access Required</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-2">
            This is a private auction. You need an access code to view and bid.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Auction: <span className="font-medium text-gray-700">{auctionTitle}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                Access Code
              </label>
              <input
                id="accessCode"
                type="text"
                placeholder="e.g., XXXX-XXXX-XXXX"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the code exactly as provided (including dashes)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !accessCode.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-md transition-colors"
            >
              {loading ? 'Validating...' : 'Submit'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-md transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
