'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Navbar() {
  const [tokens, setTokens] = useState<number | null>(null)

  const loadTokens = async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setTokens(null)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', auth.user.id)
      .single()

    setTokens(data?.token_balance ?? 0)
  }

    useEffect(() => {
      loadTokens()

      const onFocus = () => loadTokens()
      const onTokenUpdate = () => loadTokens()

      window.addEventListener('focus', onFocus)
      window.addEventListener('token-update', onTokenUpdate)

      return () => {
        window.removeEventListener('focus', onFocus)
        window.removeEventListener('token-update', onTokenUpdate)
      }
    }, [])

  return (
    <nav className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold">
          Gavel
        </Link>

        <div className="flex items-center gap-4">
          {/* Token Wallet */}
          {tokens !== null && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
              <span className="text-lg">🪙</span>
              <span className="text-sm font-semibold text-amber-700">
                {tokens}
              </span>
            </div>
          )}

          <Link
            href="/profile"
            className="flex items-center gap-2 px-3 py-2 rounded-full border hover:bg-gray-50"
          >
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
              U
            </div>
            <span className="text-sm font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
