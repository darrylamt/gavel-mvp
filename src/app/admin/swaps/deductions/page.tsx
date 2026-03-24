'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { Settings2, AlertCircle, CheckCircle2, Pencil, Check } from 'lucide-react'
import type { SwapDeductionRates, SwapPhoneModel } from '@/types/swap'

type RateRow = SwapDeductionRates & {
  swap_phone_models?: SwapPhoneModel | null
}

type EditValues = {
  screen_replacement_cost: string
  screen_replaced_fixed_deduction: string
  back_glass_replacement_cost: string
  back_glass_replaced_fixed_deduction: string
  battery_deduction_per_percent: string
  battery_replaced_fixed_deduction: string
  camera_glass_cracked_deduction: string
  front_camera_deduction: string
  rear_camera_deduction_per_camera: string
  face_id_deduction: string
  fingerprint_deduction: string
  minor_scratches_deduction: string
  dents_deduction: string
}

function rateRowToEditValues(row: RateRow): EditValues {
  return {
    screen_replacement_cost: String(row.screen_replacement_cost),
    screen_replaced_fixed_deduction: String(row.screen_replaced_fixed_deduction),
    back_glass_replacement_cost: String(row.back_glass_replacement_cost),
    back_glass_replaced_fixed_deduction: String(row.back_glass_replaced_fixed_deduction),
    battery_deduction_per_percent: String(row.battery_deduction_per_percent),
    battery_replaced_fixed_deduction: String(row.battery_replaced_fixed_deduction),
    camera_glass_cracked_deduction: String(row.camera_glass_cracked_deduction),
    front_camera_deduction: String(row.front_camera_deduction),
    rear_camera_deduction_per_camera: String(row.rear_camera_deduction_per_camera),
    face_id_deduction: String(row.face_id_deduction),
    fingerprint_deduction: String(row.fingerprint_deduction),
    minor_scratches_deduction: String(row.minor_scratches_deduction),
    dents_deduction: String(row.dents_deduction),
  }
}

type NumberInputProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function NumInput({ value, onChange, placeholder }: NumberInputProps) {
  return (
    <input
      type="number"
      min="0"
      step="1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-20 rounded-lg border border-orange-200 bg-white px-2 py-1 text-xs focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-100"
    />
  )
}

const COLUMNS: { key: keyof EditValues; label: string }[] = [
  { key: 'screen_replacement_cost', label: 'Screen Cost' },
  { key: 'screen_replaced_fixed_deduction', label: 'Screen Replaced' },
  { key: 'back_glass_replacement_cost', label: 'Back Glass Cost' },
  { key: 'back_glass_replaced_fixed_deduction', label: 'Back Glass Replaced' },
  { key: 'battery_deduction_per_percent', label: 'Battery/%' },
  { key: 'battery_replaced_fixed_deduction', label: 'Battery Replaced' },
  { key: 'camera_glass_cracked_deduction', label: 'Camera Glass' },
  { key: 'front_camera_deduction', label: 'Front Cam' },
  { key: 'rear_camera_deduction_per_camera', label: 'Rear Cam' },
  { key: 'face_id_deduction', label: 'Face ID' },
  { key: 'fingerprint_deduction', label: 'Fingerprint' },
  { key: 'minor_scratches_deduction', label: 'Scratches' },
  { key: 'dents_deduction', label: 'Dents' },
]

export default function AdminSwapDeductionsPage() {
  const [rates, setRates] = useState<RateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const [editing, setEditing] = useState<string | null>(null) // model_id being edited
  const [editValues, setEditValues] = useState<EditValues | null>(null)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const loadRates = async () => {
    setLoading(true)
    setError(null)

    const token = await getToken()
    if (!token) { setError('Unauthorized'); setLoading(false); return }

    const res = await fetch('/api/admin/swap/deductions', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load deduction rates')
    } else {
      setRates(payload?.rates ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadRates() }, [])

  const startEdit = (row: RateRow) => {
    setEditing(row.model_id)
    setEditValues(rateRowToEditValues(row))
    setActionError(null)
    setActionSuccess(null)
  }

  const saveEdit = async (row: RateRow) => {
    if (!editValues) return
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const body: Record<string, number> = {}
    for (const col of COLUMNS) {
      body[col.key] = Number(editValues[col.key]) || 0
    }

    const res = await fetch(`/api/admin/swap/deductions/${row.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to save deduction rates')
    } else {
      const modelName = row.swap_phone_models
        ? `${row.swap_phone_models.brand} ${row.swap_phone_models.model}`
        : 'Model'
      setActionSuccess(`Rates updated for ${modelName}.`)
      setEditing(null)
      setEditValues(null)
      await loadRates()
    }
    setActionBusy(false)
  }

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Deduction Rates</h1>
              <p className="text-sm text-gray-500">Per-model deduction amounts applied during phone valuation</p>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {actionSuccess && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <p className="text-sm text-emerald-700">{actionSuccess}</p>
          </div>
        )}
        {actionError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{actionError}</p>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="text-sm text-gray-400">Loading deduction rates…</p>
            </div>
          </div>
        ) : rates.length === 0 ? (
          <div className="flex min-h-[20vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="text-sm text-gray-400">No deduction rates configured yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="sticky left-0 z-10 bg-gray-50/90 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Model
                  </th>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rates.map((row) => {
                  const isEditing = editing === row.model_id
                  const model = row.swap_phone_models
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${isEditing ? 'bg-orange-50/40' : 'hover:bg-orange-50/20'}`}
                    >
                      <td className="sticky left-0 z-10 bg-white px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                        {model ? `${model.brand} ${model.model}` : row.model_id.slice(0, 8)}
                      </td>
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="px-3 py-3.5">
                          {isEditing && editValues ? (
                            <NumInput
                              value={editValues[col.key]}
                              onChange={(v) => setEditValues({ ...editValues, [col.key]: v })}
                            />
                          ) : (
                            <span className="text-gray-700">{Number((row as unknown as Record<string, unknown>)[col.key]).toLocaleString()}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-3.5 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => saveEdit(row)}
                              disabled={actionBusy}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
                            >
                              <Check className="h-3 w-3" />
                              {actionBusy ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setEditing(null); setEditValues(null) }}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(row)}
                            disabled={actionBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="px-1 text-xs text-gray-400">
          All values are in GHS. Changes take effect immediately for new valuations.
        </p>
      </div>
    </AdminShell>
  )
}
