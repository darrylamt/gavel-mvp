'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import AuthForm from '@/components/auth/AuthForm'

export default function LoginPage() {
  const router = useRouter()
  const { isChecking } = useAuthGuard({
    allowPublic: true,
    redirectIfAuthenticated: '/profile'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const signInWithEmail = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        return
      }

      // Hard redirect — guarantees navigation completes
      window.location.href = '/profile'
    } catch {
      setError('Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } catch {
      setError('Google sign in failed. Please try again.')
      setLoading(false)
    }
  }

  if (isChecking) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-gray-100 px-4 py-8 md:py-12">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm md:p-8 flex items-center gap-3">
          <span className="h-4 w-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" />
          Checking your session…
        </div>
      </main>
    )
  }

  return (
    <AuthForm
      email={email}
      password={password}
      error={error}
      loading={loading}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={signInWithEmail}
      onGoogleClick={signInWithGoogle}
      onSignUpClick={() => router.push('/signup')}
      onForgotPasswordClick={() => router.push('/reset-password')}
    />
  )
}
