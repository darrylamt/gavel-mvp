'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { Smartphone, Plus, AlertCircle, CheckCircle2, Pencil, ToggleLeft, ToggleRight, X, Tag } from 'lucide-react'
import type { SwapPhoneModel } from '@/types/swap'

type BackMaterial = SwapPhoneModel['back_material']
type Biometric = SwapPhoneModel['biometric']

const BACK_MATERIAL_OPTIONS: { value: BackMaterial; label: string }[] = [
  { value: 'glass', label: 'Glass' },
  { value: 'plastic', label: 'Plastic' },
  { value: 'metal', label: 'Metal' },
  { value: 'ceramic', label: 'Ceramic' },
]

const BIOMETRIC_OPTIONS: { value: Biometric; label: string }[] = [
  { value: 'faceID', label: 'Face ID' },
  { value: 'fingerprint', label: 'Fingerprint' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'None' },
]

const DEFAULT_CAMERAS = ['Wide', 'Ultra Wide']

type ModelFormState = {
  brand: string
  model: string
  release_year: string
  back_material: BackMaterial
  rear_cameras: string[]
  biometric: Biometric
  water_resistance_rating: string
  base_trade_in_value: string
  has_back_glass: boolean
}

const emptyForm = (): ModelFormState => ({
  brand: '',
  model: '',
  release_year: String(new Date().getFullYear()),
  back_material: 'glass',
  rear_cameras: [...DEFAULT_CAMERAS],
  biometric: 'fingerprint',
  water_resistance_rating: '',
  base_trade_in_value: '',
  has_back_glass: true,
})

export default function AdminSwapModelsPage() {
  const [models, setModels] = useState<SwapPhoneModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<ModelFormState>(emptyForm())
  const [cameraInput, setCameraInput] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ModelFormState | null>(null)
  const [editCameraInput, setEditCameraInput] = useState('')

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const loadModels = async () => {
    setLoading(true)
    setError(null)

    const token = await getToken()
    if (!token) { setError('Unauthorized'); setLoading(false); return }

    const res = await fetch('/api/admin/swap/models', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load models')
    } else {
      setModels(payload?.models ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadModels() }, [])

  const addCamera = (cameras: string[], input: string, set: (c: string[]) => void, setInput: (v: string) => void) => {
    const val = input.trim()
    if (!val || cameras.includes(val)) { setInput(''); return }
    set([...cameras, val])
    setInput('')
  }

  const removeCamera = (cameras: string[], name: string, set: (c: string[]) => void) => {
    set(cameras.filter((c) => c !== name))
  }

  const submitAdd = async () => {
    if (!form.brand.trim() || !form.model.trim() || !form.base_trade_in_value.trim()) {
      setActionError('Brand, model, and base trade-in value are required.')
      return
    }
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch('/api/admin/swap/models', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: form.brand.trim(),
        model: form.model.trim(),
        release_year: Number(form.release_year),
        back_material: form.back_material,
        rear_cameras: form.rear_cameras,
        biometric: form.biometric,
        water_resistance_rating: form.water_resistance_rating.trim() || null,
        base_trade_in_value: Number(form.base_trade_in_value),
        has_back_glass: form.has_back_glass,
      }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to add model')
    } else {
      setActionSuccess('Phone model added.')
      setShowAddForm(false)
      setForm(emptyForm())
      setCameraInput('')
      await loadModels()
    }
    setActionBusy(false)
  }

  const startEdit = (m: SwapPhoneModel) => {
    setEditingId(m.id)
    setEditForm({
      brand: m.brand,
      model: m.model,
      release_year: String(m.release_year),
      back_material: m.back_material,
      rear_cameras: [...m.rear_cameras],
      biometric: m.biometric,
      water_resistance_rating: m.water_resistance_rating ?? '',
      base_trade_in_value: String(m.base_trade_in_value),
      has_back_glass: m.has_back_glass,
    })
    setEditCameraInput('')
  }

  const saveEdit = async (id: string) => {
    if (!editForm) return
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch(`/api/admin/swap/models/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: editForm.brand.trim(),
        model: editForm.model.trim(),
        release_year: Number(editForm.release_year),
        back_material: editForm.back_material,
        rear_cameras: editForm.rear_cameras,
        biometric: editForm.biometric,
        water_resistance_rating: editForm.water_resistance_rating.trim() || null,
        base_trade_in_value: Number(editForm.base_trade_in_value),
        has_back_glass: editForm.has_back_glass,
      }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to save changes')
    } else {
      setActionSuccess('Model updated.')
      setEditingId(null)
      setEditForm(null)
      await loadModels()
    }
    setActionBusy(false)
  }

  const toggleActive = async (m: SwapPhoneModel) => {
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch(`/api/admin/swap/models/${m.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !m.is_active }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to toggle')
    } else {
      setActionSuccess(`Model ${m.is_active ? 'deactivated' : 'activated'}.`)
      await loadModels()
    }
    setActionBusy(false)
  }

  const ModelForm = ({
    f,
    setF,
    camInput,
    setCamInput,
    onSubmit,
    onCancel,
    submitLabel,
  }: {
    f: ModelFormState
    setF: (v: ModelFormState) => void
    camInput: string
    setCamInput: (v: string) => void
    onSubmit: () => void
    onCancel: () => void
    submitLabel: string
  }) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Brand <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={f.brand}
          onChange={(e) => setF({ ...f, brand: e.target.value })}
          placeholder="e.g. Apple"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Model <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={f.model}
          onChange={(e) => setF({ ...f, model: e.target.value })}
          placeholder="e.g. iPhone 15 Pro"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Release Year</label>
        <input
          type="number"
          min="2010"
          max="2030"
          value={f.release_year}
          onChange={(e) => setF({ ...f, release_year: e.target.value })}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Back Material</label>
        <select
          value={f.back_material}
          onChange={(e) => setF({ ...f, back_material: e.target.value as BackMaterial })}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        >
          {BACK_MATERIAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Biometric</label>
        <select
          value={f.biometric}
          onChange={(e) => setF({ ...f, biometric: e.target.value as Biometric })}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        >
          {BIOMETRIC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Base Trade-in Value (GHS) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="0"
          value={f.base_trade_in_value}
          onChange={(e) => setF({ ...f, base_trade_in_value: e.target.value })}
          placeholder="e.g. 2000"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Water Resistance Rating <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={f.water_resistance_rating}
          onChange={(e) => setF({ ...f, water_resistance_rating: e.target.value })}
          placeholder="e.g. IP68"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>
      <div className="flex items-center gap-2 pt-6">
        <input
          type="checkbox"
          id="has_back_glass"
          checked={f.has_back_glass}
          onChange={(e) => setF({ ...f, has_back_glass: e.target.checked })}
          className="rounded accent-orange-500"
        />
        <label htmlFor="has_back_glass" className="text-sm font-medium text-gray-700">Has Back Glass</label>
      </div>

      {/* Cameras tag input */}
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Rear Cameras</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {f.rear_cameras.map((cam) => (
            <span key={cam} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
              <Tag className="h-3 w-3" />
              {cam}
              <button
                type="button"
                onClick={() => removeCamera(f.rear_cameras, cam, (c) => setF({ ...f, rear_cameras: c }))}
                className="ml-0.5 rounded-full text-orange-500 hover:text-orange-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={camInput}
            onChange={(e) => setCamInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCamera(f.rear_cameras, camInput, (c) => setF({ ...f, rear_cameras: c }), setCamInput)
              }
            }}
            placeholder="e.g. Telephoto — press Enter to add"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
          <button
            type="button"
            onClick={() => addCamera(f.rear_cameras, camInput, (c) => setF({ ...f, rear_cameras: c }), setCamInput)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3 pt-2">
        <button
          onClick={onSubmit}
          disabled={actionBusy}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {actionBusy ? 'Saving…' : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Phone Models</h1>
                <p className="text-sm text-gray-500">Configure supported phone models for swap</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              {showAddForm ? (
                <><X className="h-4 w-4" /> Cancel</>
              ) : (
                <><Plus className="h-4 w-4" /> Add Model</>
              )}
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">New Phone Model</h2>
            <ModelForm
              f={form}
              setF={setForm}
              camInput={cameraInput}
              setCamInput={setCameraInput}
              onSubmit={submitAdd}
              onCancel={() => { setShowAddForm(false); setForm(emptyForm()); setCameraInput('') }}
              submitLabel="Add Model"
            />
            {actionError && (
              <p className="mt-3 text-sm text-red-600">{actionError}</p>
            )}
          </div>
        )}

        {/* Edit form */}
        {editingId && editForm && (
          <div className="rounded-2xl border border-orange-100 bg-orange-50/30 px-5 py-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Editing: {editForm.brand} {editForm.model}
            </h2>
            <ModelForm
              f={editForm}
              setF={setEditForm}
              camInput={editCameraInput}
              setCamInput={setEditCameraInput}
              onSubmit={() => saveEdit(editingId)}
              onCancel={() => { setEditingId(null); setEditForm(null) }}
              submitLabel="Save Changes"
            />
            {actionError && (
              <p className="mt-3 text-sm text-red-600">{actionError}</p>
            )}
          </div>
        )}

        {/* Feedback */}
        {actionSuccess && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <p className="text-sm text-emerald-700">{actionSuccess}</p>
          </div>
        )}
        {!showAddForm && !editingId && actionError && (
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

        {/* Table */}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="text-sm text-gray-400">Loading models…</p>
            </div>
          </div>
        ) : models.length === 0 ? (
          <div className="flex min-h-[20vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="text-sm text-gray-400">No phone models yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Brand</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Model</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Year</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Back</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Biometric</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Base Value</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Active</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {models.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-orange-50/20">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{m.brand}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{m.model}</p>
                      {m.rear_cameras.length > 0 && (
                        <p className="text-xs text-gray-400">{m.rear_cameras.join(' · ')}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{m.release_year}</td>
                    <td className="px-5 py-3.5 capitalize text-gray-600">{m.back_material}</td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {BIOMETRIC_OPTIONS.find((o) => o.value === m.biometric)?.label ?? m.biometric}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      GHS {Number(m.base_trade_in_value).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActive(m)}
                        disabled={actionBusy}
                        title={m.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {m.is_active ? (
                          <ToggleRight className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => startEdit(m)}
                        disabled={actionBusy}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
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
