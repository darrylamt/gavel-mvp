'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sendReset = async () => {
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Password reset link sent to your email.')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md border rounded-xl p-6 bg-white">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>

        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {message && <p className="text-green-600 text-sm mb-2">{message}</p>}

        <button
          onClick={sendReset}
          className="w-full bg-black text-white py-2 rounded"
        >
          Send Reset Link
        </button>
      </div>
    </main>
  )
}
