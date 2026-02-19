'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type FormState = {
  name: string
  email: string
  subject: string
  message: string
}

const initialState: FormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

export default function ContactFormCard() {
  const [form, setForm] = useState<FormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isDisabled = useMemo(() => {
    return (
      submitting ||
      !form.name.trim() ||
      !form.email.trim() ||
      !form.subject.trim() ||
      !form.message.trim()
    )
  }, [form, submitting])

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify(form),
      })

      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to send message. Please try again.')
        return
      }

      setForm(initialState)
      setSuccessMessage('Message sent successfully. Our team will contact you soon.')
    } catch {
      setErrorMessage('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold text-gray-900">Get in Touch with Us</h2>

      <form className="mt-5" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="Your full name"
            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            maxLength={120}
            required
          />
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="Type your email"
            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            maxLength={180}
            required
          />
        </div>

        <input
          value={form.subject}
          onChange={(event) => updateField('subject', event.target.value)}
          placeholder="Subject"
          className="mt-3 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
          maxLength={180}
          required
        />

        <textarea
          rows={5}
          value={form.message}
          onChange={(event) => updateField('message', event.target.value)}
          placeholder="Send your message request"
          className="mt-3 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
          maxLength={5000}
          required
        />

        {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
        {successMessage && <p className="mt-3 text-sm text-green-700">{successMessage}</p>}

        <button
          type="submit"
          disabled={isDisabled}
          className="mt-4 rounded-md bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Sending...' : 'Send message'}
        </button>
      </form>
    </div>
  )
}
