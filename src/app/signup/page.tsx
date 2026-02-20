'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'

function isExistingAccountMessage(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('user already')
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showExistingAccountModal, setShowExistingAccountModal] = useState(false)

  const signUpWithEmail = async () => {
    setLoading(true)
    setError(null)

    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim()
    const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          full_name: fullName,
          username: fullName,
        },
      },
    })

    setLoading(false)

    const alreadyExistsFromError = Boolean(error?.message && isExistingAccountMessage(error.message))
    const alreadyExistsFromObfuscatedUser =
      !error &&
      Boolean(data?.user) &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0

    if (alreadyExistsFromError || alreadyExistsFromObfuscatedUser) {
      setError(null)
      setShowExistingAccountModal(true)
      return
    }

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
        firstName={firstName}
        lastName={lastName}
        email={email}
        password={password}
        error={error}
        loading={loading}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
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

      {showExistingAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl">
              🔐
            </div>
            <h2 className="text-center text-2xl font-bold text-gray-900">Account already exists</h2>
            <p className="mt-3 text-center text-sm text-gray-600">
              An account with <span className="font-medium text-gray-900">{email}</span> already exists.
            </p>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in directly, or reset your password if you can’t remember it.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => setShowExistingAccountModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => router.push('/reset-password')}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Reset Password
              </button>
              <button
                onClick={() => router.push('/login')}
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
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
