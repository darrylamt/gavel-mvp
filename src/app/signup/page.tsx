'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const signUpWithEmail = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      alert('Check your email to confirm your account')
      router.push('/login')
    }
  }

  const signUpWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    })
  }

  return (
    <main>
      <AuthForm
        isSignUp={true}
        email={email}
        password={password}
        error={error}
        loading={loading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={signUpWithEmail}
        onGoogleClick={signUpWithGoogle}
        onSignUpClick={() => router.push('/login')}
      />
    </main>
  )
}
