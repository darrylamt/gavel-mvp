'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const signInWithEmail = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push('/profile')
    }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    })
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>

      <button
        onClick={signInWithGoogle}
        className="w-full mb-4 border py-2 rounded hover:bg-gray-50"
      >
        Continue with Google
      </button>

      <div className="my-4 text-center text-gray-500">or</div>

      <input
        type="email"
        placeholder="Email"
        className="border p-2 w-full mb-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="border p-2 w-full mb-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <button
        onClick={signInWithEmail}
        disabled={loading}
        className="w-full bg-black text-white py-2 rounded"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <p className="mt-4 text-sm text-center">
        Don’t have an account?{' '}
        <a href="/signup" className="underline">
          Sign up
        </a>
      </p>

      <p className="mt-2 text-sm text-center">
        <a href="/reset-password" className="underline">
          Forgot password?
        </a>
      </p>
    </main>
  )
}
