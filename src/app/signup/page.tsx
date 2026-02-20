'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'

export default function SignupPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null)

  const signUpWithEmail = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setOtpCode('')
      setOtpError(null)
      setOtpSentMessage(`We sent a 6-digit verification code to ${email}.`)
      setShowOtpModal(true)
    }
  }

  const verifyOtpAndFinishSignup = async () => {
    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim()
    const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim()

    setOtpLoading(true)
    setOtpError(null)

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otpCode.trim(),
      type: 'email',
    })

    if (verifyError) {
      setOtpError(verifyError.message || 'Invalid verification code')
      setOtpLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        full_name: fullName,
        username: fullName,
      },
    })

    setOtpLoading(false)

    if (updateError) {
      setOtpError(updateError.message || 'Failed to complete signup')
      return
    }

    setShowOtpModal(false)
    router.replace('/profile')
    router.refresh()
  }

  const resendOtp = async () => {
    setOtpLoading(true)
    setOtpError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })

    setOtpLoading(false)

    if (error) {
      setOtpError(error.message)
      return
    }

    setOtpSentMessage(`A new verification code was sent to ${email}.`)
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

      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
              🔐
            </div>
            <h2 className="text-center text-2xl font-bold text-gray-900">Verify your email</h2>
            <p className="mt-3 text-center text-sm text-gray-600">Enter the 6-digit code sent to <span className="font-medium text-gray-900">{email}</span>.</p>

            {otpSentMessage && <p className="mt-2 text-center text-xs text-gray-500">{otpSentMessage}</p>}

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Verification code</label>
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 6-digit code"
                className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-gray-500"
              />
            </div>

            {otpError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{otpError}</p>}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => setShowOtpModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={resendOtp}
                disabled={otpLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
              >
                Resend code
              </button>
              <button
                onClick={verifyOtpAndFinishSignup}
                disabled={otpLoading || otpCode.trim().length !== 6}
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {otpLoading ? 'Verifying…' : 'Verify & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
