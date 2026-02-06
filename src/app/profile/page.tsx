'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

import ProfileHeader from '@/components/profile/ProfileHeader'
import UsernameSection from '@/components/profile/UsernameSection'
import TokenBalanceCard from '@/components/profile/TokenBalanceCard'
import BidHistory from '@/components/profile/BidHistory'

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [tokens, setTokens] = useState(0)
  const [bids, setBids] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  /* ---------------- load profile ---------------- */

  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setLoading(false)
        return
      }

      setUserId(auth.user.id)

      // profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, token_balance')
        .eq('id', auth.user.id)
        .single()

      setUsername(profile?.username ?? null)
      setUsernameInput(profile?.username ?? '')
      setTokens(profile?.token_balance ?? 0)

      // bid history
      const { data: bidsData } = await supabase
        .from('bids')
        .select(
          `
          id,
          amount,
          created_at,
          auctions (
            title
          )
        `
        )
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })

      setBids(bidsData ?? [])
      setLoading(false)
    }

    loadProfile()
  }, [])

  /* ---------------- save username ---------------- */

  const saveUsername = async () => {
    if (!userId) return

    const cleaned = usernameInput.trim().toLowerCase()

    if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) {
      setError(
        'Username must be 3–20 characters and contain only letters, numbers, or underscores.'
      )
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const { error } = await supabase
        .from('profiles')
        .update({ username: cleaned })
        .eq('id', userId)

      if (error) {
        if (error.code === '23505') {
          setError('Username already taken')
        } else {
          setError('Failed to save username')
        }
        return
      }

      setUsername(cleaned)
      setSuccess(true)
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return <p className="p-6">Loading profile…</p>
  }

  if (!userId) {
    return (
      <p className="p-6 text-sm text-gray-600">
        Please sign in to manage your profile.
      </p>
    )
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <ProfileHeader username={username} />

      <TokenBalanceCard tokens={tokens} />

      <UsernameSection
        username={username}
        value={usernameInput}
        setValue={setUsernameInput}
        onSave={saveUsername}
        saving={saving}
        error={error}
        success={success}
      />

      <BidHistory bids={bids} />
    </main>
  )
}
