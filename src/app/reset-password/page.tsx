'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'
import styled from 'styled-components'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const sendResetLink = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <StyledWrapper>
        <div className="success-container">
          <h1>Check Your Email</h1>
          <p>We've sent a password reset link to <strong>{email}</strong></p>
          <p>Follow the link to reset your password. If you don't see the email, check your spam folder.</p>
          <button onClick={() => router.push('/login')} className="back-button">
            Back to Login
          </button>
        </div>
      </StyledWrapper>
    )
  }

  return (
    <StyledWrapper>
      <form className="form" onSubmit={(e) => {
        e.preventDefault()
        sendResetLink()
      }}>
        <h2>Reset Password</h2>
        <p className="description">Enter your email address and we'll send you a link to reset your password.</p>
        
        {error && <div className="error-message">{error}</div>}

        <div className="flex-column">
          <label>Email</label>
        </div>
        <div className="inputForm">
          <svg
            height={20}
            viewBox="0 0 32 32"
            width={20}
            xmlns="http://www.w3.org/2000/svg"
          >
            <g id="Layer_3" data-name="Layer 3">
              <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z" />
            </g>
          </svg>
          <input
            type="email"
            className="input"
            placeholder="Enter your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button
          className="button-submit"
          type="submit"
          disabled={loading || !email}
        >
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>

        <p className="p">
          Remember your password?{' '}
          <span className="span" onClick={() => router.push('/login')}>
            Back to Login
          </span>
        </p>
      </form>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;

  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-color: #ffffff;
    padding: 30px;
    width: 450px;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

    @media (max-width: 600px) {
      width: 100%;
      max-width: 400px;
      padding: 20px;
    }
  }

  h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #151717;
    margin: 0 0 0.5rem 0;
  }

  .description {
    color: #666666;
    font-size: 0.95rem;
    margin: 0 0 1.5rem 0;
  }

  .error-message {
    background-color: #fee;
    color: #c33;
    padding: 10px;
    border-radius: 5px;
    font-size: 14px;
    margin-bottom: 10px;
  }

  .flex-column {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .flex-column > label {
    color: #151717;
    font-weight: 600;
  }

  .inputForm {
    border: 1.5px solid #ecedec;
    border-radius: 10px;
    height: 50px;
    display: flex;
    align-items: center;
    padding-left: 10px;
    transition: 0.2s ease-in-out;
  }

  .input {
    margin-left: 10px;
    border-radius: 10px;
    border: none;
    width: 85%;
    height: 100%;
    font-size: 14px;
    font-family: inherit;

    &:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }
  }

  .input:focus {
    outline: none;
  }

  .inputForm:focus-within {
    border: 1.5px solid #2d79f3;
  }

  .button-submit {
    margin: 20px 0 10px 0;
    background-color: #151717;
    border: none;
    color: white;
    font-size: 15px;
    font-weight: 500;
    border-radius: 10px;
    height: 50px;
    width: 100%;
    cursor: pointer;
    font-family: inherit;
    transition: 0.2s ease-in-out;

    &:hover:not(:disabled) {
      background-color: #252727;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .p {
    text-align: center;
    color: black;
    font-size: 14px;
    margin: 5px 0;
  }

  .span {
    font-size: 14px;
    color: #2d79f3;
    font-weight: 500;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .success-container {
    background-color: #ffffff;
    padding: 40px;
    border-radius: 20px;
    width: 450px;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

    @media (max-width: 600px) {
      width: 100%;
      max-width: 400px;
      padding: 30px 20px;
    }
  }

  .success-container h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #151717;
    margin: 0 0 1rem 0;
  }

  .success-container p {
    color: #666666;
    font-size: 0.95rem;
    margin: 0.75rem 0;
    line-height: 1.6;
  }

  .success-container p strong {
    color: #2d79f3;
    font-weight: 600;
  }

  .back-button {
    margin-top: 2rem;
    background-color: #151717;
    border: none;
    color: white;
    font-size: 15px;
    font-weight: 500;
    border-radius: 10px;
    padding: 0.875rem 2rem;
    cursor: pointer;
    font-family: inherit;
    transition: 0.2s ease-in-out;

    &:hover {
      background-color: #252727;
    }
  }
`
