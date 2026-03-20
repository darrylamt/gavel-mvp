'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { Search, Store, X, AlertCircle, Clock, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

type SellerApplication = {
  id: string
  user_id: string
  business_name: string
  shop_name?: string | null
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

    const displayName = statusFilter === 'approved'
      ? (application.shop_name || application.business_name)
      : application.business_name

    return `${displayName} ${application.business_name} ${application.phone} ${application.address}`
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

  const deleteSeller = async (application: SellerApplication) => {
    const confirmed = window.confirm(`Delete seller account for ${application.shop_name || application.business_name}? This will permanently remove their account and all associated data. This action cannot be undone.`)
    if (!confirmed) return

    setBusyId(application.id)
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

    const res = await fetch(`/api/admin/sellers/${application.user_id}/delete`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to delete seller account')
      setBusyId(null)
      return
    }

    await loadApplications(statusFilter)
    setSelected(null)
    setBusyId(null)
  }

  const banSeller = async (application: SellerApplication) => {
    const confirmed = window.confirm(`Ban seller ${application.shop_name || application.business_name}? This will remove their seller access and deactivate their shop.`)
    if (!confirmed) return

    setBusyId(application.id)
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

    const res = await fetch(`/api/admin/sellers/${application.user_id}/ban`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to ban seller')
      setBusyId(null)
      return
    }

    await loadApplications(statusFilter)
    setSelected(null)
    setBusyId(null)
  }

  const tabConfig: { status: StatusFilter; label: string; icon: React.ReactNode }[] = [
    { status: 'pending', label: 'Pending', icon: <Clock className="h-3.5 w-3.5" /> },
    { status: 'approved', label: 'Approved', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    { status: 'rejected', label: 'Rejected', icon: <XCircle className="h-3.5 w-3.5" /> },
  ]

  return (
    <AdminShell>
      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Seller Applications</h2>
            <p className="text-sm text-gray-500">Review, approve, or reject seller onboarding requests.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {tabConfig.map(({ status, label, icon }) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-auto sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search applications"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="text-sm text-gray-400">Loading applications…</p>
            </div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <p className="text-sm text-gray-400">No {statusFilter} applications found.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-gray-50 sm:hidden">
              {filteredApplications.map((application) => {
                const displayName = statusFilter === 'approved'
                  ? (application.shop_name || application.business_name)
                  : application.business_name
                return (
                  <div key={application.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{application.phone}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{new Date(application.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <AppStatusBadge status={application.status} />
                      <button
                        onClick={() => setSelected(application)}
                        className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600"
                      >
                        View
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden max-h-[60vh] overflow-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Business</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Phone</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Submitted</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-orange-50/30 transition-colors align-top">
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {statusFilter === 'approved' ? (application.shop_name || application.business_name) : application.business_name}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{application.phone}</td>
                      <td className="px-5 py-3.5 text-gray-500">{new Date(application.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5"><AppStatusBadge status={application.status} /></td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelected(application)}
                          className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selected.shop_name || selected.business_name}</h3>
                <p className="mt-0.5 text-sm text-gray-400">Submitted {new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <InfoItem label="Business Type" value={selected.business_type} />
                <InfoItem label="Application Name" value={selected.business_name} />
                <InfoItem label="Phone" value={selected.phone} />
                <InfoItem label="Address" value={selected.address} />
                <InfoItem label="Ghana Card" value={selected.national_id_number} />
                <InfoItem label="Status" value={selected.status} />
                <InfoItem
                  label="Rejection Reason"
                  value={selected.rejection_reason || '—'}
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Ghana Card Document</p>
                  {selected.id_document_signed_url ? (
                    <a
                      href={selected.id_document_signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Document
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">Unavailable</p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Photo Holding Ghana Card</p>
                  {selected.selfie_with_card_signed_url ? (
                    <a
                      href={selected.selfie_with_card_signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Photo
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">Unavailable</p>
                  )}
                </div>
              </div>

              {/* Pending actions */}
              {selected.status === 'pending' && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => reviewApplication(selected.id, 'approved')}
                    disabled={busyId === selected.id}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {busyId === selected.id ? 'Processing…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => reviewApplication(selected.id, 'rejected')}
                    disabled={busyId === selected.id}
                    className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {busyId === selected.id ? 'Processing…' : 'Reject'}
                  </button>
                </div>
              )}

              {/* Approved actions */}
              {selected.status === 'approved' && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => banSeller(selected)}
                    disabled={busyId === selected.id}
                    className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {busyId === selected.id ? 'Banning…' : 'Ban Seller'}
                  </button>
                  <button
                    onClick={() => deleteSeller(selected)}
                    disabled={busyId === selected.id}
                    className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {busyId === selected.id ? 'Deleting…' : 'Delete Account'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function AppStatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-red-50 text-red-700 border-red-100',
  }
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}
