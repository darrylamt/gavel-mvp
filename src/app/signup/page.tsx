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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

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
      setShowConfirmationModal(true)
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
    <>
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

      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
              ✉️
            </div>
            <h2 className="text-center text-2xl font-bold text-gray-900">Confirm your email</h2>
            <p className="mt-3 text-center text-sm text-gray-600">
              We sent a confirmation link to <span className="font-medium text-gray-900">{email}</span>.
            </p>
            <p className="mt-2 text-center text-sm text-gray-600">
              If you don&apos;t see it in your inbox, please check your spam or junk folder.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => router.push('/login')}
                className="flex-1 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
