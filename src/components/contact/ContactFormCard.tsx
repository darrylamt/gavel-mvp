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

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="Your full name"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            maxLength={120}
            required
          />
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="Your email address"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            maxLength={180}
            required
          />
        </div>

        <input
          value={form.subject}
          onChange={(event) => updateField('subject', event.target.value)}
          placeholder="Subject"
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          maxLength={180}
          required
        />

        <textarea
          rows={5}
          value={form.message}
          onChange={(event) => updateField('message', event.target.value)}
          placeholder="How can we help you?"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none"
          maxLength={5000}
          required
        />

        {errorMessage && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{errorMessage}</p>
        )}
        {successMessage && (
          <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">{successMessage}</p>
        )}

        <button
          type="submit"
          disabled={isDisabled}
          className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  )
}
