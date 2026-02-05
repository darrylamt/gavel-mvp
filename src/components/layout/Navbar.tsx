'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export default function Navbar() {
  const isAdmin = useIsAdmin()

  const [username, setUsername] = useState<string | null>(null)
  const [tokens, setTokens] = useState<number>(0)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data } = await supabase
        .from('profiles')
        .select('username, tokens')
        .eq('id', auth.user.id)
        .single()

      if (data) {
        setUsername(data.username)
        setTokens(data.tokens ?? 0)
      }
    }

    loadProfile()
  }, [])

  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            gavel
          </Link>

          <Link href="/auctions" className="text-sm text-gray-600 hover:text-black">
            Auctions
          </Link>

          {isAdmin && (
            <>
              <Link href="/admin" className="text-sm text-gray-600 hover:text-black">
                Admin
              </Link>
              <Link href="/admin/new" className="text-sm text-gray-600 hover:text-black">
                Create Auction
              </Link>
            </>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Token badge */}
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 border border-amber-200">
            <span className="text-amber-500 text-sm">🪙</span>
            <span className="text-sm font-semibold text-amber-700">
              {tokens}
            </span>
          </div>

          <Link
            href="/tokens"
            className="text-sm font-medium text-amber-700 hover:underline"
          >
            Buy Tokens
          </Link>

          {/* User */}
          {username && (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full border px-3 py-1 hover:bg-gray-50"
            >
              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">
                @{username}
              </span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
