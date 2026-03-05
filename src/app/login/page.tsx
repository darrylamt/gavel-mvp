'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import AuthForm from '@/components/auth/AuthForm'

export default function LoginPage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading, isChecking } = useAuthGuard({ 
    allowPublic: true, 
    redirectIfAuthenticated: '/profile' 
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (authUser && !isRedirecting && !authLoading && !isChecking) {
      setIsRedirecting(true)
      router.replace('/profile')
      const timeout = window.setTimeout(() => {
        window.location.href = '/profile'
      }, 800)
      return () => window.clearTimeout(timeout)
    }
  }, [authUser, isRedirecting, authLoading, isChecking, router])

  const signInWithEmail = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      setIsRedirecting(true)
      router.replace('/profile')
      router.refresh()
    } catch {
      setError('Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setError(null)
    setLoading(true)
    setIsRedirecting(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setIsRedirecting(false)
      }
    } catch {
      setError('Google sign in failed. Please try again.')
      setIsRedirecting(false)
    } finally {
      setLoading(false)
    }
  }

  if (isChecking || authLoading || authUser || isRedirecting) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-gray-100 px-4 py-8 md:py-12">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm md:p-8">
          {isRedirecting || authUser ? 'Sign in successful. Redirecting to your profile…' : 'Checking your session…'}
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
