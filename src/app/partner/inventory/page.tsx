'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PartnerShell from '@/components/partner/PartnerShell'
import { Package, Plus, AlertCircle, CheckCircle2, Pencil, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import type { SwapPhoneModel, SwapInventoryItem } from '@/types/swap'

type InventoryRow = SwapInventoryItem & {
  swap_phone_models?: SwapPhoneModel | null
}

type EditValues = {
  storage: string
  color: string
  condition: SwapInventoryItem['condition']
  price: string
  quantity: string
}

const CONDITION_OPTIONS: { value: SwapInventoryItem['condition']; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'used_excellent', label: 'Used — Excellent' },
  { value: 'used_good', label: 'Used — Good' },
  { value: 'used_fair', label: 'Used — Fair' },
]

export default function PartnerInventoryPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [models, setModels] = useState<SwapPhoneModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<EditValues | null>(null)

  // Add form state
  const [addModelId, setAddModelId] = useState('')
  const [addStorage, setAddStorage] = useState('')
  const [addColor, setAddColor] = useState('')
  const [addCondition, setAddCondition] = useState<SwapInventoryItem['condition']>('new')
  const [addPrice, setAddPrice] = useState('')
  const [addQty, setAddQty] = useState('1')

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const loadModels = async () => {
    const res = await fetch('/api/swap/models')
    const payload = await res.json().catch(() => null)
    if (res.ok) setModels(payload?.models ?? [])
  }

  const loadInventory = async () => {
    setLoading(true)
    setError(null)

    const token = await getToken()
    if (!token) { setError('Unauthorized'); setLoading(false); return }

    const res = await fetch('/api/admin/swap/inventory', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load inventory')
    } else {
      setInventory(payload?.inventory ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    Promise.all([loadInventory(), loadModels()])
  }, [])

  const addItem = async () => {
    if (!addModelId || !addStorage.trim() || !addColor.trim() || !addPrice.trim()) {
      setActionError('Please fill in all required fields.')
      return
    }
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch('/api/admin/swap/inventory', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_id: addModelId,
        storage: addStorage.trim(),
        color: addColor.trim(),
        condition: addCondition,
        price: Number(addPrice),
        quantity: Number(addQty),
      }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to add item')
    } else {
      setActionSuccess('Item added to inventory.')
      setShowAddForm(false)
      setAddModelId('')
      setAddStorage('')
      setAddColor('')
      setAddCondition('new')
      setAddPrice('')
      setAddQty('1')
      await loadInventory()
    }
    setActionBusy(false)
  }

  const startEdit = (item: InventoryRow) => {
    setEditingId(item.id)
    setEditValues({
      storage: item.storage,
      color: item.color,
      condition: item.condition,
      price: String(item.price),
      quantity: String(item.quantity),
    })
  }

  const saveEdit = async (id: string) => {
    if (!editValues) return
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch(`/api/admin/swap/inventory/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage: editValues.storage,
        color: editValues.color,
        condition: editValues.condition,
        price: Number(editValues.price),
        quantity: Number(editValues.quantity),
      }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to save changes')
    } else {
      setActionSuccess('Item updated.')
      setEditingId(null)
      setEditValues(null)
      await loadInventory()
    }
    setActionBusy(false)
  }

  const toggleActive = async (item: InventoryRow) => {
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch(`/api/admin/swap/inventory/${item.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to toggle')
    } else {
      setActionSuccess(`Item ${item.is_active ? 'deactivated' : 'activated'}.`)
      await loadInventory()
    }
    setActionBusy(false)
  }

  const deleteItem = async (item: InventoryRow) => {
    const modelName = item.swap_phone_models
      ? `${item.swap_phone_models.brand} ${item.swap_phone_models.model}`
      : 'this item'
    if (!confirm(`Delete ${modelName} ${item.storage} from inventory? This cannot be undone.`)) return

    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch(`/api/admin/swap/inventory/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to delete item')
    } else {
      setActionSuccess('Item deleted.')
      await loadInventory()
    }
    setActionBusy(false)
  }

  const conditionLabel = (c: SwapInventoryItem['condition']) => {
    return CONDITION_OPTIONS.find((o) => o.value === c)?.label ?? c
  }

  return (
    <PartnerShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
                <p className="text-sm text-gray-500">Phones available for upgrade swaps</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? (
                <><X className="h-4 w-4" /> Cancel</>
              ) : (
                <><Plus className="h-4 w-4" /> Add Phone</>
              )}
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">New Inventory Item</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Phone Model <span className="text-red-500">*</span>
                </label>
                <select
                  value={addModelId}
                  onChange={(e) => setAddModelId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select model…</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brand} {m.model} ({m.release_year})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Storage <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addStorage}
                  onChange={(e) => setAddStorage(e.target.value)}
                  placeholder="e.g. 128GB"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Color <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addColor}
                  onChange={(e) => setAddColor(e.target.value)}
                  placeholder="e.g. Midnight Black"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Condition</label>
                <select
                  value={addCondition}
                  onChange={(e) => setAddCondition(e.target.value as SwapInventoryItem['condition'])}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {CONDITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Price (GHS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={addItem}
                disabled={actionBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {actionBusy ? 'Saving…' : 'Save Item'}
              </button>
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            </div>
          </div>
        )}

        {/* Feedback */}
        {actionSuccess && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <p className="text-sm text-emerald-700">{actionSuccess}</p>
          </div>
        )}
        {!showAddForm && actionError && (
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
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="text-sm text-gray-400">Loading inventory…</p>
            </div>
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex min-h-[20vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="text-sm text-gray-400">No inventory items yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Model</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Storage</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Color</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Condition</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Price (GHS)</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Qty</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Active</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inventory.map((item) => {
                  const isEditing = editingId === item.id
                  const model = item.swap_phone_models
                  return (
                    <tr key={item.id} className={`transition-colors ${isEditing ? 'bg-blue-50/40' : 'hover:bg-blue-50/20'}`}>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {model ? `${model.brand} ${model.model}` : item.model_id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues?.storage ?? ''}
                            onChange={(e) => setEditValues((v) => v ? { ...v, storage: e.target.value } : v)}
                            className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                          />
                        ) : item.storage}
                      </td>
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues?.color ?? ''}
                            onChange={(e) => setEditValues((v) => v ? { ...v, color: e.target.value } : v)}
                            className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                          />
                        ) : item.color}
                      </td>
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <select
                            value={editValues?.condition ?? 'new'}
                            onChange={(e) => setEditValues((v) => v ? { ...v, condition: e.target.value as SwapInventoryItem['condition'] } : v)}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                          >
                            {CONDITION_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : conditionLabel(item.condition)}
                      </td>
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editValues?.price ?? ''}
                            onChange={(e) => setEditValues((v) => v ? { ...v, price: e.target.value } : v)}
                            className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                          />
                        ) : Number(item.price).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editValues?.quantity ?? ''}
                            onChange={(e) => setEditValues((v) => v ? { ...v, quantity: e.target.value } : v)}
                            className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                          />
                        ) : item.quantity}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => toggleActive(item)}
                          disabled={actionBusy}
                          className="transition-colors"
                          title={item.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {item.is_active ? (
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(item.id)}
                                disabled={actionBusy}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {actionBusy ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setEditValues(null) }}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(item)}
                                disabled={actionBusy}
                                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteItem(item)}
                                disabled={actionBusy}
                                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PartnerShell>
  )
}
