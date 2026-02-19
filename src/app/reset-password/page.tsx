'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const sendResetLink = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-gray-100 px-4 py-8 md:py-12">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Check your email</h1>
          <p className="mt-3 text-sm text-gray-600">
            We sent a password reset link to <span className="font-semibold text-gray-900">{email}</span>.
          </p>
          <p className="mt-2 text-sm text-gray-600">If you don’t see it, check your spam or junk folder.</p>

          <button
            onClick={() => router.push('/login')}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Back to Sign in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-gray-100 px-4 py-8 md:py-12">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Forgot password</h1>
        <p className="mt-1 text-sm text-gray-500">Enter your email and we’ll send a secure reset link.</p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            sendResetLink()
          }}
        >
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500"
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-black text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading || !email}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-5 w-full text-center text-sm font-medium text-gray-700 hover:text-black"
        >
          Remember your password? Back to Sign in
        </button>
      </div>
    </main>
  )
}
