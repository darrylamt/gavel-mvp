'use client'

import { useState } from 'react'
import AdminShell from '@/components/admin/AdminShell'
import { supabase } from '@/lib/supabaseClient'

export default function BroadcastEmailPage() {
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    sent?: number
    total?: number
    error?: string
    message?: string
    recipientCount?: number
    errors?: string[]
  } | null>(null)

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      alert('Please fill in both subject and content')
      return
    }

    const confirmed = confirm(
      'Are you sure you want to send this email to ALL users? This action cannot be undone.'
    )

    if (!confirmed) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        setResult({ error: 'Not authenticated' })
        return
      }

      const response = await fetch('/api/admin/broadcast-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject,
          htmlContent: content.replace(/\n/g, '<br>')
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setSubject('')
        setContent('')
      }
    } catch (error) {
      setResult({
        error: 'Failed to send broadcast',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell>
      <div className="max-w-3xl">
        <h1 className="mb-2 text-2xl font-bold">Broadcast Email</h1>
        <p className="mb-6 text-sm text-gray-600">
          Send an email to all registered users. Use with caution.
        </p>

        {result && (
          <div
            className={`mb-4 rounded-lg p-4 ${
              result.success
                ? 'bg-green-50 text-green-800'
                : result.recipientCount
                  ? 'bg-yellow-50 text-yellow-800'
                  : 'bg-red-50 text-red-800'
            }`}
          >
            {result.success ? (
              <div>
                <p className="font-semibold">✓ Email sent successfully!</p>
                <p className="mt-1 text-sm">
                  Sent to {result.sent} of {result.total} users
                </p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium">Some batches failed:</p>
                    <ul className="ml-4 list-disc">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : result.recipientCount ? (
              <div>
                <p className="font-semibold">⚠ Email service not configured</p>
                <p className="mt-1 text-sm">{result.message}</p>
                <p className="mt-1 text-sm">
                  Would send to {result.recipientCount} users once configured.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold">✗ Error sending email</p>
                <p className="mt-1 text-sm">{result.error}</p>
                {result.message && <p className="mt-1 text-sm">{result.message}</p>}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="subject" className="mb-2 block text-sm font-medium">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 focus:border-black focus:outline-none"
              placeholder="Email subject line"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="content" className="mb-2 block text-sm font-medium">
              Message
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full rounded-lg border px-4 py-2 font-mono text-sm focus:border-black focus:outline-none"
              placeholder="Email content (HTML supported)&#10;&#10;Example:&#10;&lt;h1&gt;Hello!&lt;/h1&gt;&#10;&lt;p&gt;This is a broadcast message.&lt;/p&gt;"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              HTML tags are supported. Line breaks will be converted to &lt;br&gt; tags.
            </p>
          </div>

          <button
            onClick={handleSend}
            disabled={loading || !subject.trim() || !content.trim()}
            className="rounded-lg bg-black px-6 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send to All Users'}
          </button>
        </div>

        <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="mb-2 font-semibold text-yellow-900">Setup Instructions</h3>
          <p className="mb-2 text-sm text-yellow-800">
            To enable email broadcasting, you need to:
          </p>
          <ol className="ml-4 list-decimal space-y-1 text-sm text-yellow-800">
            <li>
              Install Resend: <code className="rounded bg-yellow-100 px-1 py-0.5">npm install resend</code>
            </li>
            <li>
              Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a>
            </li>
            <li>Add your domain and verify DNS records</li>
            <li>
              Add <code className="rounded bg-yellow-100 px-1 py-0.5">RESEND_API_KEY</code> to your .env.local file
            </li>
            <li>
              Update the &quot;from&quot; address in the API route to match your verified domain
            </li>
          </ol>
        </div>
      </div>
    </AdminShell>
  )
}
