// src/components/Navbar.tsx

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
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* LEFT */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight"
          >
            gavel
          </Link>

          <Link href="/auctions" className="font-medium">
            Auctions
          </Link>

          <Link href="/tokens" className="font-medium">
            Buy Tokens
          </Link>

          {isAdmin && (
            <>
              <Link href="/admin" className="font-medium">
                Admin
              </Link>
              <Link href="/admin/new" className="font-medium">
                Create Auction
              </Link>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {username && (
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                {username[0]?.toUpperCase()}
              </div>

              <div className="text-sm">
                <p className="font-semibold">@{username}</p>
                <p className="text-gray-500 text-xs">
                  🪙 {tokens} tokens
                </p>
              </div>
            </div>
          )}

          <Link
            href="/profile"
            className="text-sm font-medium underline"
          >
            Profile
          </Link>
        </div>
      </div>
    </nav>
  )
}
