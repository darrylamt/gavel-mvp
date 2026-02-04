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
  <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    {/* LEFT */}
    <div className="flex items-center gap-6">
      <Link href="/" className="font-extrabold text-xl">
        gavel
      </Link>

      <Link href="/auctions" className="text-sm font-medium text-gray-700">
        Auctions
      </Link>
    </div>

    {/* RIGHT */}
    <div className="flex items-center gap-6 text-sm font-medium">
      <Link href="/tokens">Buy Tokens</Link>
      <Link href="/profile">Profile</Link>

      {/* Admin links stay conditional */}
      {isAdmin && (
        <>
          <Link href="/admin">Admin</Link>
          <Link href="/admin/new">Create Auction</Link>
        </>
      )}
    </div>
  </div>
</nav>
  )
}
