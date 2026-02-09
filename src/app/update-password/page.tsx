'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const updatePassword = async () => {
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    router.push('/login')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md border rounded-xl p-6 bg-white">
        <h1 className="text-2xl font-bold mb-4">Set New Password</h1>

        <input
          type="password"
          placeholder="New password"
          className="border p-2 w-full mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        <button
          onClick={updatePassword}
          className="w-full bg-black text-white py-2 rounded"
        >
          Update Password
        </button>
      </div>
    </main>
  )
}
