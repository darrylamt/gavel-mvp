'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'

export default function SignupPage() {
  const router = useRouter()
  const [showExtendedSignup, setShowExtendedSignup] = useState(false)
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

    const {
      data: { user: verifiedUser },
    } = await supabase.auth.getUser()

    if (verifiedUser?.id && fullName) {
      await supabase
        .from('profiles')
        .upsert(
          {
            id: verifiedUser.id,
            username: fullName,
          },
          { onConflict: 'id' }
        )

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (accessToken) {
        await fetch('/api/whatsapp/account-created', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      }
    }

    setShowOtpModal(false)
    router.replace('/profile?onboarding=1')
    router.refresh()
  }

  const resendOtp = async () => {
    setOtpCode('')
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
    setError(null)
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/profile%3Fonboarding%3D1`,
      },
    })
    setLoading(false)
  }

  return (
    <>
      {!showExtendedSignup ? (
        <main className="min-h-[calc(100dvh-64px)] bg-gray-100 px-4 py-8 md:py-12">
          <section className="mx-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
            <p className="mt-1 text-sm text-gray-500">Use Google for the fastest signup.</p>

            {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <button
              type="button"
              onClick={signUpWithGoogle}
              disabled={loading}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg width={20} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.209 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.85 1.154 7.967 3.033l5.657-5.657C34.053 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.85 1.154 7.967 3.033l5.657-5.657C34.053 6.053 29.277 4 24 4c-7.682 0-14.347 4.337-17.694 10.691z" />
                <path fill="#4CAF50" d="M24 44c5.176 0 9.86-1.977 13.409-5.191l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.188 0-9.625-3.327-11.286-7.946l-6.522 5.025C9.5 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.084 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z" />
              </svg>
              {loading ? 'Redirecting…' : 'Sign up with Google'}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null)
                setShowExtendedSignup(true)
              }}
              className="mt-4 w-full text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-black"
            >
              Don’t have a Google account? Use extended sign up
            </button>

            <p className="mt-5 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button type="button" onClick={() => router.push('/login')} className="font-semibold text-black hover:underline">
                Sign in
              </button>
            </p>
          </section>
        </main>
      ) : (
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
      )}

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
