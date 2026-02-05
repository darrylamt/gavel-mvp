'use client'

import Link from 'next/link'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export default function Navbar() {
  const { profile, loading } = useUserProfile()
  const isAdmin = useIsAdmin()

  return (
    <nav className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* LEFT */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            gavel
          </Link>

          <Link href="/auctions" className="text-sm font-medium text-gray-700 hover:text-black">
            Auctions
          </Link>

          {isAdmin && (
            <Link href="/admin" className="text-sm font-medium text-gray-700 hover:text-black">
              Admin
            </Link>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {!loading && profile && (
            <>
              {/* Token pill */}
              <Link
                href="/tokens"
                className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-gray-200"
              >
                🪙
                <span>{profile.tokens}</span>
              </Link>

              {/* User */}
              <Link
                href="/profile"
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                  {profile.username?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  @{profile.username ?? 'user'}
                </span>
              </Link>
            </>
          )}

          {!profile && !loading && (
            <Link
              href="/login"
              className="text-sm font-semibold text-white bg-black px-4 py-2 rounded"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
