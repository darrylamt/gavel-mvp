'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export default function Navbar() {
  const isAdmin = useIsAdmin()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const loadUsername = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', auth.user.id)
        .single()

      setUsername(data?.username ?? null)
    }

    loadUsername()
  }, [])

  return (
    <nav className="w-full border-b p-4 flex gap-4 items-center">
      <Link href="/">Home</Link>
      <Link href="/auctions">Auctions</Link>

      {username && (
        <Link
          href="/profile"
          className="ml-auto font-semibold"
        >
          @{username}
        </Link>
      )}

      {!username && (
        <Link href="/profile" className="ml-auto">
          Account
        </Link>
      )}

      {isAdmin === true && (
        <>
          <Link href="/admin">Admin</Link>
          <Link href="/admin/new">Create Auction</Link>
        </>
      )}
    </nav>
  )
}
