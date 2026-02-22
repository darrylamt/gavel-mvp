'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type SellerApplication = {
  id: string
  user_id: string
  business_name: string
  business_type: string
  phone: string
  address: string
  national_id_number: string
  id_document_url: string
  selfie_with_card_url: string | null
  id_document_signed_url: string | null
  selfie_with_card_signed_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
}

type StatusFilter = 'pending' | 'approved' | 'rejected'

export default function AdminSellersPage() {
  const [applications, setApplications] = useState<SellerApplication[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<SellerApplication | null>(null)

  const loadApplications = async (status: StatusFilter) => {
    setLoading(true)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setApplications([])
      setLoading(false)
      return
    }

    const res = await fetch(`/api/admin/seller-applications?status=${status}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load seller applications')
      setApplications([])
      setLoading(false)
      return
    }

    setApplications(payload?.applications ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadApplications(statusFilter)
  }, [statusFilter])

  const filteredApplications = applications.filter((application) => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true

    return `${application.business_name} ${application.phone} ${application.address}`
      .toLowerCase()
      .includes(query)
  })

  const reviewApplication = async (id: string, action: 'approved' | 'rejected') => {
    setBusyId(id)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setError('Unauthorized')
      setBusyId(null)
      return
    }

    let rejectionReason: string | null = null
    if (action === 'rejected') {
      const input = window.prompt('Optional rejection reason:')
      rejectionReason = input ? input.trim() : null
    }

    const res = await fetch(`/api/admin/seller-applications/${id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action,
        rejection_reason: rejectionReason,
      }),
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Review action failed')
      setBusyId(null)
      return
    }

    await loadApplications(statusFilter)
    setSelected(null)
    setBusyId(null)
  }

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Seller Applications</h2>
        <p className="mt-1 text-sm text-gray-500">Review, approve, or reject seller onboarding requests.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {(['pending', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                statusFilter === status
                  ? 'bg-black text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {status[0].toUpperCase() + status.slice(1)}
            </button>
          ))}
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search applications"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:ml-auto sm:max-w-xs"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading applications…</p>
        ) : filteredApplications.length === 0 ? (
          <p className="text-sm text-gray-500">No {statusFilter} applications found.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Business</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Submitted</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="border-t align-top">
                    <td className="py-2 font-medium">{application.business_name}</td>
                    <td className="py-2">{application.phone}</td>
                    <td className="py-2">{new Date(application.created_at).toLocaleString()}</td>
                    <td className="py-2">{application.status}</td>
                    <td className="py-2">
                      <button
                        onClick={() => setSelected(application)}
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
                <h3 className="text-xl font-semibold">{selected.business_name}</h3>
                <p className="text-sm text-gray-500">Submitted {new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <InfoItem label="Business Type" value={selected.business_type} />
              <InfoItem label="Phone" value={selected.phone} />
              <InfoItem label="Address" value={selected.address} />
              <InfoItem label="Ghana Card" value={selected.national_id_number} />
              <InfoItem label="Status" value={selected.status} />
              <InfoItem
                label="Rejection Reason"
                value={selected.rejection_reason || '—'}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Ghana Card Document</p>
                {selected.id_document_signed_url ? (
                  <a
                    href={selected.id_document_signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  >
                    Open Document
                  </a>
                ) : (
                  <p className="text-xs text-gray-500">Unavailable</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Photo Holding Ghana Card</p>
                {selected.selfie_with_card_signed_url ? (
                  <a
                    href={selected.selfie_with_card_signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  >
                    Open Photo
                  </a>
                ) : (
                  <p className="text-xs text-gray-500">Unavailable</p>
                )}
              </div>
            </div>

            {selected.status === 'pending' && (
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => reviewApplication(selected.id, 'approved')}
                  disabled={busyId === selected.id}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => reviewApplication(selected.id, 'rejected')}
                  disabled={busyId === selected.id}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-800">{value}</p>
    </div>
  )
}
