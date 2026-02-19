'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type ContactMessage = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'new' | 'read' | 'replied' | 'archived'
  source: string
  created_at: string
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ContactMessage | null>(null)

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        setMessages([])
        setLoading(false)
        return
      }

      const res = await fetch('/api/admin/messages', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setError(payload?.error || 'Failed to load contact messages')
        setMessages([])
        setLoading(false)
        return
      }

      setMessages(payload?.messages ?? [])
      setLoading(false)
    }

    loadMessages()
  }, [])

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Messages</h2>
        <p className="mt-1 text-sm text-gray-500">Get in Touch submissions from the contact page.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-500">No contact messages found.</p>
        ) : (
          <div className="max-h-[68vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((item) => (
                  <tr key={item.id} className="border-t align-top">
                    <td className="py-2 whitespace-nowrap">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="py-2">{item.name}</td>
                    <td className="py-2">{item.email}</td>
                    <td className="py-2">{item.subject}</td>
                    <td className="py-2">
                      <button
                        onClick={() => setSelected(item)}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold">{selected.subject}</h3>
                <p className="text-sm text-gray-500">From {selected.name} ({selected.email})</p>
                <p className="text-xs text-gray-500">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{selected.message}</p>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}