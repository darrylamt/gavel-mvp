'use client'

import React, { useState } from 'react'

interface AuthFormProps {
  isSignUp?: boolean
  firstName?: string
  lastName?: string
  email: string
  password: string
  error?: string | null
  loading?: boolean
  onFirstNameChange?: (value: string) => void
  onLastNameChange?: (value: string) => void
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onSubmit: () => void
  onGoogleClick: () => void
  onSignUpClick?: () => void
  onForgotPasswordClick?: () => void
  rememberMe?: boolean
  onRememberMeChange?: (checked: boolean) => void
}

const AuthForm: React.FC<AuthFormProps> = ({
  isSignUp = false,
  firstName = '',
  lastName = '',
  email,
  password,
  error,
  loading = false,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogleClick,
  onSignUpClick,
  onForgotPasswordClick,
  rememberMe = false,
  onRememberMeChange,
}) => {
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-gray-100 px-4 py-8 md:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="hidden rounded-3xl bg-black p-8 text-white shadow-sm lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Gavel Ghana</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">
              {isSignUp ? 'Create your account and start bidding.' : 'Welcome back to your auction dashboard.'}
            </h1>
          </div>
          <p className="text-sm text-white/70">Secure access to auctions, tokens, starred listings, and checkout.</p>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-gray-900">{isSignUp ? 'Create account' : 'Sign in'}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {isSignUp
                ? 'Use Google for faster signup, or continue with email.'
                : 'Continue with Google or use your email and password.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onGoogleClick}
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width={20} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.209 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.85 1.154 7.967 3.033l5.657-5.657C34.053 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.85 1.154 7.967 3.033l5.657-5.657C34.053 6.053 29.277 4 24 4c-7.682 0-14.347 4.337-17.694 10.691z" />
              <path fill="#4CAF50" d="M24 44c5.176 0 9.86-1.977 13.409-5.191l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.188 0-9.625-3.327-11.286-7.946l-6.522 5.025C9.5 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.084 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z" />
            </svg>
            {isSignUp ? 'Sign up with Google' : 'Continue with Google'}
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Or continue with email</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            {isSignUp && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">First name</label>
                  <input
                    type="text"
                    className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => onFirstNameChange?.(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Last name</label>
                  <input
                    type="text"
                    className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => onLastNameChange?.(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="flex h-11 items-center rounded-xl border border-gray-300 pr-2 transition focus-within:border-gray-500">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="h-full w-full rounded-xl border-0 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 text-gray-600">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => onRememberMeChange?.(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={onForgotPasswordClick}
                  className="font-medium text-gray-700 hover:text-black"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-black text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading || (isSignUp && (!firstName.trim() || !lastName.trim()))}
            >
              {loading ? 'Processing…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : 'Don’t have an account?'}{' '}
            <button type="button" onClick={() => onSignUpClick?.()} className="font-semibold text-black hover:underline">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </section>
      </div>
    </main>
  )
}

export default AuthForm
