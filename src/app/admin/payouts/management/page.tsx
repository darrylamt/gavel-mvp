'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { AlertCircle, CheckCircle2, Clock, XCircle, Ban, PlayCircle } from 'lucide-react'

type Payout = {
  id: string
  order_id: string | null
  auction_id: string | null
  seller_id: string
  buyer_id: string
  gross_amount: number
  commission_amount: number
  payout_amount: number
  status: 'pending' | 'on_hold' | 'processing' | 'success' | 'failed' | 'reversed'
  hold_reason: string | null
  payout_trigger: string | null
  scheduled_release_at: string | null
  created_at: string
  seller?: { username: string; phone: string }
  buyer?: { username: string }
  order?: { id: string; total_amount: number }
  auction?: { title: string; current_price: number }
}

type Summary = {
  total_pending: number
  total_pending_value: number
  total_on_hold: number
  total_on_hold_value: number
  total_processing: number
  total_processing_value: number
  total_success: number
  total_success_value: number
  total_failed: number
  total_commission: number
}

export default function AdminPayoutsManagementPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userId, setUserId] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      await loadPayouts()
    }
    init()
  }, [statusFilter])

  const loadPayouts = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('Unauthorized')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/admin/payouts?mode=management&status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await res.json()

      if (res.ok) {
        setPayouts(result.data || [])
        setSummary(result.summary || null)
      } else {
        setError(result.error || 'Failed to load payouts')
      }
    } catch (err) {
      setError('Failed to load payouts')
    } finally {
      setLoading(false)
    }
  }

  const holdPayout = async (payoutId: string) => {
    const reason = prompt('Enter reason for holding this payout:')
    if (!reason || !userId) return

    setActionInProgress(payoutId)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/payouts/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payout_id: payoutId,
          hold_reason: reason,
          admin_id: userId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert('✓ Payout placed on hold')
        await loadPayouts()
      } else {
        setError(data.error || 'Failed to hold payout')
      }
    } catch (err) {
      setError('Failed to hold payout')
    } finally {
      setActionInProgress(null)
    }
  }

  const releasePayout = async (payoutId: string) => {
    if (!confirm('Release this payout?') || !userId) return

    setActionInProgress(payoutId)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/payouts/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payout_id: payoutId,
          admin_id: userId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert('✓ Payout released')
        await loadPayouts()
      } else {
        setError(data.error || 'Failed to release payout')
      }
    } catch (err) {
      setError('Failed to release payout')
    } finally {
      setActionInProgress(null)
    }
  }

  const getStatusIcon = (status: Payout['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'on_hold':
        return <Ban className="h-4 w-4" />
      case 'processing':
        return <PlayCircle className="h-4 w-4" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4" />
      case 'failed':
      case 'reversed':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: Payout['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800'
      case 'on_hold':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'failed':
      case 'reversed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Payout Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage seller payouts with escrow, hold, and release controls
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">
              {summary.total_pending}
            </p>
            <p className="text-xs text-amber-700">
              GHS {summary.total_pending_value.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-900">On Hold</p>
            <p className="mt-1 text-2xl font-bold text-red-900">
              {summary.total_on_hold}
            </p>
            <p className="text-xs text-red-700">
              GHS {summary.total_on_hold_value.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-900">Successful</p>
            <p className="mt-1 text-2xl font-bold text-green-900">
              {summary.total_success}
            </p>
            <p className="text-xs text-green-700">
              GHS {summary.total_success_value.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Commission</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              GHS {summary.total_commission.toFixed(2)}
            </p>
            <p className="text-xs text-blue-700">From all payouts</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          {['all', 'pending', 'on_hold', 'processing', 'success', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-medium ${
                statusFilter === status
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading payouts...</p>
        ) : payouts.length === 0 ? (
          <p className="text-sm text-gray-500">No payouts found</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Seller</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Gross</th>
                  <th className="py-2">Commission</th>
                  <th className="py-2">Payout</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-t align-top">
                    <td className="py-3">
                      <p className="text-xs text-gray-600">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </p>
                      {payout.scheduled_release_at && payout.status === 'pending' && (
                        <p className="text-xs text-amber-600">
                          Release: {new Date(payout.scheduled_release_at).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-gray-900">
                        {payout.seller?.username || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{payout.seller?.phone}</p>
                    </td>
                    <td className="py-3">
                      {payout.order_id && <span className="text-xs">Shop Order</span>}
                      {payout.auction_id && (
                        <span className="text-xs">{payout.auction?.title?.slice(0, 20)}</span>
                      )}
                    </td>
                    <td className="py-3 whitespace-nowrap">GHS {payout.gross_amount.toFixed(2)}</td>
                    <td className="py-3 whitespace-nowrap text-gray-500">
                      GHS {payout.commission_amount.toFixed(2)}
                    </td>
                    <td className="py-3 whitespace-nowrap font-medium">
                      GHS {payout.payout_amount.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <div
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                          payout.status
                        )}`}
                      >
                        {getStatusIcon(payout.status)}
                        {payout.status.replace('_', ' ')}
                      </div>
                      {payout.hold_reason && (
                        <p className="mt-1 text-xs text-gray-500" title={payout.hold_reason}>
                          {payout.hold_reason.slice(0, 30)}...
                        </p>
                      )}
                    </td>
                    <td className="py-3">
                      {payout.status === 'pending' && (
                        <button
                          onClick={() => holdPayout(payout.id)}
                          disabled={actionInProgress === payout.id}
                          className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          Hold
                        </button>
                      )}
                      {payout.status === 'on_hold' && (
                        <button
                          onClick={() => releasePayout(payout.id)}
                          disabled={actionInProgress === payout.id}
                          className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          Release
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
