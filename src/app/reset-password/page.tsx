'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Reset Password</h1>

      {sent ? (
        <p>Check your email for a reset link.</p>
      ) : (
        <>
          <input
            type="email"
            placeholder="Your email"
            className="border p-2 w-full mb-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error && <p className="text-red-600">{error}</p>}

          <button
            onClick={sendReset}
            className="bg-black text-white py-2 w-full rounded"
          >
            Send reset link
          </button>
        </>
      )}
    </main>
  )
}
