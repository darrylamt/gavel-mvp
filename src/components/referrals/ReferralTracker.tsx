'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

/**
 * Reads ?ref=GAV-XXXXXX from the URL and saves it to a 30-day cookie.
 * First referrer wins — will not overwrite an existing cookie.
 * If the visitor is already logged in, skip (no self-referral).
 * Rendered as an invisible component in the root layout.
 */
export default function ReferralTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (!ref?.startsWith('GAV-')) return

    // Don't overwrite existing cookie — first referrer wins
    const existing = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith('gavel_ref='))
    if (existing) return

    // Don't apply to already-logged-in users (they signed up before this visit)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) return // already registered — skip

      // Set 30-day cookie
      const expires = new Date()
      expires.setDate(expires.getDate() + 30)
      const secure = location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `gavel_ref=${encodeURIComponent(ref)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`
    })
  }, [searchParams])

  return null
}
