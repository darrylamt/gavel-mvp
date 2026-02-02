'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export default function Navbar() {
  const isAdmin = useIsAdmin()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user.id)
        .single()

      setUsername(profile?.username ?? null)
    }

    load()
  }, [])

  return (
    <nav className="w-full border-b p-4 flex items-center gap-4">
      <Link href="/">Home</Link>
      <Link href="/auctions">Auctions</Link>

      <div className="ml-auto flex items-center gap-3">
        {username && (
          <Link
            href="/profile"
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
              {username[0].toUpperCase()}
            </div>
            <span className="font-semibold">
              @{username}
            </span>
          </Link>
        )}

        {!username && (
          <Link href="/profile">Account</Link>
        )}

        {isAdmin === true && (
          <>
            <Link href="/admin">Admin</Link>
            <Link href="/admin/new">
              Create Auction
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
