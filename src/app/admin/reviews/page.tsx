'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type AdminReview = {
  id: string
  product_id: string
  reviewer_name: string | null
  rating: number
  title: string | null
  body: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
  shop_products: {
    title: string | null
  } | null
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const pendingReviews = useMemo(
    () => reviews.filter((review) => review.status === 'pending'),
    [reviews]
  )

  const loadReviews = async (filter: StatusFilter = statusFilter) => {
    setLoading(true)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setError('Unauthorized')
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    params.set('status', filter)

    const res = await fetch(`/api/admin/shop-reviews?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load reviews')
      setReviews([])
      setLoading(false)
      return
    }

    setReviews(payload?.reviews ?? [])
    setSelectedIds([])
    setLoading(false)
  }

  useEffect(() => {
    loadReviews('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runAction = async (action: 'approve_selected' | 'reject_selected' | 'approve_all_pending' | 'reject_all_pending') => {
    setSaving(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Unauthorized')

      const res = await fetch('/api/admin/shop-reviews', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          reviewIds: selectedIds,
        }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Action failed')

      await loadReviews(statusFilter)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleSelectAllPending = () => {
    const pendingIds = pendingReviews.map((review) => review.id)
    const allSelected = pendingIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? selectedIds.filter((id) => !pendingIds.includes(id)) : Array.from(new Set([...selectedIds, ...pendingIds])))
  }

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Product Reviews</h2>
            <p className="mt-1 text-sm text-gray-500">Approve or reject customer reviews before publishing.</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => {
                const next = event.target.value as StatusFilter
                setStatusFilter(next)
                void loadReviews(next)
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={() => loadReviews(statusFilter)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={toggleSelectAllPending}
            disabled={pendingReviews.length === 0 || saving}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            Select all pending
          </button>
          <button
            onClick={() => runAction('approve_selected')}
            disabled={selectedIds.length === 0 || saving}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Approve selected
          </button>
          <button
            onClick={() => runAction('reject_selected')}
            disabled={selectedIds.length === 0 || saving}
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            Reject selected
          </button>
          <button
            onClick={() => runAction('approve_all_pending')}
            disabled={pendingReviews.length === 0 || saving}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            Approve all pending
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No reviews found.</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Select</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Product</th>
                  <th className="py-2">Reviewer</th>
                  <th className="py-2">Rating</th>
                  <th className="py-2">Review</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const canSelect = review.status === 'pending'
                  const checked = selectedIds.includes(review.id)

                  return (
                    <tr key={review.id} className="border-t align-top">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canSelect}
                          onChange={() => toggleSelection(review.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="py-2 whitespace-nowrap">{new Date(review.created_at).toLocaleString()}</td>
                      <td className="py-2">{review.shop_products?.title || 'Product'}</td>
                      <td className="py-2">{review.reviewer_name || 'User'}</td>
                      <td className="py-2">{review.rating}/5</td>
                      <td className="py-2">
                        <div className="max-w-[28rem]">
                          {review.title && <p className="font-medium text-gray-900">{review.title}</p>}
                          {review.body && <p className="text-gray-700">{review.body}</p>}
                        </div>
                      </td>
                      <td className="py-2 capitalize">{review.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
