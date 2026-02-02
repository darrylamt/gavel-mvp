'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLocked, setIsLocked] = useState(false)


  // Load user + profile
  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser()

      if (!auth.user) {
        setLoading(false)
        return
      }

      setUserId(auth.user.id)

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', auth.user.id)
        .single()

      if (data?.username) {
        setUsername(data.username)
        setIsLocked(true)
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  const saveUsername = async () => {
    if (!userId) return

    const cleaned = username.trim().toLowerCase()

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

      setSuccess(true)
    } finally {
      setSaving(false)
    }
  }

  /* ---------- UI ---------- */

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
    <main className="p-6 max-w-md mx-auto">
      {username && (
        <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center text-3xl font-bold mb-4">
          {username[0].toUpperCase()}
        </div>
      )}
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>

      <label className="block mb-1 font-medium">
        Username
      </label>

      <input
        type="text"
        className="border p-2 w-full mb-2"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={saving || isLocked}
        placeholder="e.g. darryl_01"
      />
      {isLocked && (
        <p className="text-sm text-gray-600 mb-2">
          Your username is permanent and cannot be changed once set.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 mb-2">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-600 mb-2">
          Username saved successfully
        </p>
      )}

      <button
        onClick={saveUsername}
        disabled={saving || isLocked}
        className={`mt-2 px-4 py-2 text-white ${
          saving ? 'bg-gray-400' : 'bg-black'
        }`}
      >
        {isLocked ? 'Username Locked' : saving ? 'Saving…' : 'Save Username'}
      </button>
    </main>
  )
}
