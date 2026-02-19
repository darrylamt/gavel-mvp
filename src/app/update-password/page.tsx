'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const updatePassword = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-gray-100 px-4 py-8 md:py-12">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Password updated</h1>
          <p className="mt-2 text-sm text-gray-600">Your new password is set. You can now sign in securely.</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Continue to Sign in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-gray-100 px-4 py-8 md:py-12">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Set new password</h1>
        <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account.</p>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">New password</label>
            <input
              type="password"
              placeholder="Enter new password"
              className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            onClick={updatePassword}
            disabled={loading || password.length < 6}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-black text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>
    </main>
  )
}
