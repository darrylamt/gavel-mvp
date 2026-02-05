'use client'

import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* LEFT: Brand + Primary Nav */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-tight"
          >
            gavel
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/auctions"
              className="text-sm font-medium text-gray-700 hover:text-black"
            >
              Auctions
            </Link>

            <Link
              href="/tokens"
              className="text-sm font-medium text-gray-700 hover:text-black"
            >
              Tokens
            </Link>
          </div>
        </div>

        {/* RIGHT: Wallet + Profile */}
        <div className="flex items-center gap-4">
          {/* Token wallet */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
            <span className="text-lg">🪙</span>
            <span className="text-sm font-semibold text-amber-700">
              100
            </span>
          </div>

          {/* Profile */}
          <Link
            href="/profile"
            className="flex items-center gap-2 px-3 py-2 rounded-full border hover:bg-gray-50"
          >
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
              U
            </div>
            <span className="text-sm font-medium text-gray-700">
              Profile
            </span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
