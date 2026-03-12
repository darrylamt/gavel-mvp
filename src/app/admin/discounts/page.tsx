'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type DiscountRow = {
  id: string
  code: string
  percent_off: number
  max_uses: number | null
  used_count: number
  ends_at: string | null
  is_active: boolean
  created_at: string
}

export default function AdminDiscountsPage() {
  const BASELINE_COMMISSION = 10

  const [discounts, setDiscounts] = useState<DiscountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [globalSaving, setGlobalSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [percentOff, setPercentOff] = useState('10')
  const [maxUses, setMaxUses] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [globalCommissionPercent, setGlobalCommissionPercent] = useState('10')

  const parsedGlobalCommission = Number(globalCommissionPercent)
  const hasValidGlobalCommission = Number.isFinite(parsedGlobalCommission)
    && parsedGlobalCommission >= 0
    && parsedGlobalCommission <= BASELINE_COMMISSION
  const globalDiscountPercent = hasValidGlobalCommission
    ? Number((BASELINE_COMMISSION - parsedGlobalCommission).toFixed(2))
    : null

  const getAdminToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.access_token || null
  }

  const loadGlobalBuyNowDiscount = async () => {
    setGlobalError(null)

    const token = await getAdminToken()
    if (!token) {
      setGlobalError('Unauthorized')
      return
    }

    const res = await fetch('/api/admin/discounts/buy-now-commission', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setGlobalError(payload?.error || 'Failed to load Buy Now discount settings')
      return
    }

    const percent = Number(payload?.commission_percent)
    if (Number.isFinite(percent)) {
      setGlobalCommissionPercent(String(percent))
    }
  }

  const loadDiscounts = async () => {
    setLoading(true)
    setError(null)

    const token = await getAdminToken()
    if (!token) {
      setError('Unauthorized')
      setLoading(false)
      return
    }

    const res = await fetch('/api/admin/discounts', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load discounts')
      setLoading(false)
      return
    }

    setDiscounts((payload?.discounts ?? []) as DiscountRow[])
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([loadDiscounts(), loadGlobalBuyNowDiscount()])
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const createDiscount = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    const token = await getAdminToken()
    if (!token) {
      setError('Unauthorized')
      setSaving(false)
      return
    }

    const res = await fetch('/api/admin/discounts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        percent_off: Number(percentOff),
        max_uses: maxUses.trim() ? Number(maxUses) : null,
        ends_at: endsAt.trim() ? new Date(endsAt).toISOString() : null,
      }),
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to create discount code')
      setSaving(false)
      return
    }

    setCode('')
    setPercentOff('10')
    setMaxUses('')
    setEndsAt('')
    setSuccess('Discount code created.')
    await loadDiscounts()
    setSaving(false)
  }

  const toggleDiscount = async (row: DiscountRow) => {
    setError(null)
    setSuccess(null)

    const token = await getAdminToken()
    if (!token) {
      setError('Unauthorized')
      return
    }

    const res = await fetch('/api/admin/discounts', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: row.id,
        is_active: !row.is_active,
      }),
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to update discount')
      return
    }

    setSuccess(`Discount ${row.code} ${row.is_active ? 'disabled' : 'enabled'}.`)
    await loadDiscounts()
  }

  const saveGlobalBuyNowDiscount = async () => {
    setGlobalSaving(true)
    setGlobalError(null)
    setGlobalSuccess(null)

    const token = await getAdminToken()
    if (!token) {
      setGlobalError('Unauthorized')
      setGlobalSaving(false)
      return
    }

    const res = await fetch('/api/admin/discounts/buy-now-commission', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commission_percent: Number(globalCommissionPercent),
        apply_to_existing: true,
      }),
    })

    const payload = await res.json().catch(() => null)
    if (!res.ok) {
      setGlobalError(payload?.error || 'Failed to save Buy Now discount')
      setGlobalSaving(false)
      return
    }

    const discountPercent = Number(payload?.discount_percent)
    setGlobalSuccess(
      Number.isFinite(discountPercent)
        ? `Saved. Global Buy Now discount is now ${discountPercent}% from the 10% baseline.`
        : 'Saved global Buy Now discount.'
    )

    await loadGlobalBuyNowDiscount()
    setGlobalSaving(false)
  }

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-xl font-semibold">Discount Codes</h2>
        <p className="mt-1 text-sm text-gray-500">Create checkout discount codes with percentage off, expiry time, and usage limits.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Global Buy Now Discount</h3>
        <p className="mt-1 text-sm text-gray-500">
          Baseline commission is 10%. Set a lower global commission to discount all Buy Now listings.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Commission (%)</label>
            <input
              type="number"
              min={0}
              max={10}
              step="0.1"
              value={globalCommissionPercent}
              onChange={(event) => setGlobalCommissionPercent(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="block text-xs uppercase tracking-wide text-gray-500">Baseline</span>
            <span className="font-semibold">{BASELINE_COMMISSION}%</span>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span className="block text-xs uppercase tracking-wide text-emerald-700">Global Discount</span>
            <span className="font-semibold">{globalDiscountPercent !== null ? `${globalDiscountPercent}%` : '—'}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={saveGlobalBuyNowDiscount}
            disabled={globalSaving || !hasValidGlobalCommission}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {globalSaving ? 'Applying…' : 'Apply to All Products'}
          </button>
          {globalError ? <p className="text-sm text-red-600">{globalError}</p> : null}
          {globalSuccess ? <p className="text-sm text-green-700">{globalSuccess}</p> : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">New Discount Code</h3>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Code (e.g. SAVE10)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            max={100}
            value={percentOff}
            onChange={(event) => setPercentOff(event.target.value)}
            placeholder="Percent off"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
            placeholder="Max uses (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={createDiscount}
            disabled={saving}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {saving ? 'Saving…' : 'Create Discount'}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-green-700">{success}</p> : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Existing Codes</h3>

        {loading ? (
          <p className="mt-3 text-sm text-gray-500">Loading discounts…</p>
        ) : discounts.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No discount codes yet.</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Code</th>
                  <th className="py-2">% Off</th>
                  <th className="py-2">Usage</th>
                  <th className="py-2">Ends</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="py-2 font-medium text-gray-900">{row.code}</td>
                    <td className="py-2">{Number(row.percent_off).toLocaleString()}%</td>
                    <td className="py-2">
                      {row.used_count}
                      {row.max_uses !== null ? ` / ${row.max_uses}` : ' / unlimited'}
                    </td>
                    <td className="py-2">{row.ends_at ? new Date(row.ends_at).toLocaleString() : 'No expiry'}</td>
                    <td className="py-2">
                      {row.is_active ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Active</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Inactive</span>
                      )}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => toggleDiscount(row)}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
                      >
                        {row.is_active ? 'Disable' : 'Enable'}
                      </button>
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
