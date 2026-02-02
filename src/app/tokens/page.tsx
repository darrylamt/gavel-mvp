'use client'

import Link from 'next/link'

export default function TokensPage() {
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
        <div className="border p-4 rounded">
          <h2 className="font-semibold">
            10 Tokens
          </h2>
          <p className="text-sm text-gray-600">
            GHS 10
          </p>
          <button
            disabled
            className="mt-2 bg-gray-300 text-white px-4 py-2 w-full"
          >
            Coming Soon
          </button>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold">
            50 Tokens
          </h2>
          <p className="text-sm text-gray-600">
            GHS 45
          </p>
          <button
            disabled
            className="mt-2 bg-gray-300 text-white px-4 py-2 w-full"
          >
            Coming Soon
          </button>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold">
            100 Tokens
          </h2>
          <p className="text-sm text-gray-600">
            GHS 80
          </p>
          <button
            disabled
            className="mt-2 bg-gray-300 text-white px-4 py-2 w-full"
          >
            Coming Soon
          </button>
        </div>
      </div>

      <Link
        href="/auctions"
        className="block text-center text-sm text-gray-600 mt-6"
      >
        ← Back to auctions
      </Link>
    </main>
  )
}
