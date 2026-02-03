'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export default function Navbar() {
  const isAdmin = useIsAdmin()

  const [username, setUsername] = useState<string | null>(null)
  const [tokens, setTokens] = useState<number | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data } = await supabase
        .from('profiles')
        .select('username, token_balance')
        .eq('id', auth.user.id)
        .single()

      setUsername(data?.username ?? 'User')
      setTokens(data?.token_balance ?? 0)
    }

    loadProfile()
  }, [])

  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* LEFT — BRAND */}
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight"
        >
          Gavel
        </Link>

        {/* CENTER — NAV */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link
            href="/"
            className="hover:text-gray-600"
          >
            Home
          </Link>

          <Link
            href="/auctions"
            className="hover:text-gray-600"
          >
            Auctions
          </Link>

          {isAdmin && (
            <Link
              href="/admin/new"
              className="hover:text-gray-600"
            >
              Create Auction
            </Link>
          )}
        </div>

        {/* RIGHT — USER */}
        <div className="flex items-center gap-4">
          {/* TOKEN PILL */}
          <Link
            href="/tokens"
            className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-gray-200 transition"
          >
            🪙 {tokens ?? 0}
          </Link>

          {/* AVATAR */}
          <Link
            href="/profile"
            className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold"
            title={username ?? ''}
          >
            {username?.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>
    </nav>
  )
}
