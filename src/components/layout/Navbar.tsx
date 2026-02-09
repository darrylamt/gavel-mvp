'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/hooks/useAuthUser'

export default function Navbar() {
  const { user, loading } = useAuthUser()
  const [tokens, setTokens] = useState<number | null>(null)

  useEffect(() => {
    if (!user) {
      setTokens(null)
      return
    }

    const loadTokens = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('token_balance')
        .eq('id', user.id)
        .single()

      setTokens(data?.token_balance ?? 0)
    }

    loadTokens()
  }, [user])

  return (
    <nav className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold">
          Gavel
        </Link>

        {!loading && (
          <div className="flex items-center gap-4">
            {/* Not logged in */}
            {!user && (
              <Link
                href="/login"
                className="px-4 py-2 rounded-full border hover:bg-gray-50"
              >
                Sign In
              </Link>
            )}

            {/* Logged in */}
            {user && (
              <>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
                  <span>🪙</span>
                  <span className="font-semibold text-amber-700">
                    {tokens ?? 0}
                  </span>
                </div>

                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-full border hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                    {user.email?.[0]?.toUpperCase()}
                  </div>
                  <span>Profile</span>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
