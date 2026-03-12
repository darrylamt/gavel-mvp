'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Settings, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { ALL_LOCATIONS } from '@/lib/ghanaLocations'

type SellerDeliveryRow = {
  item_id: string
  order_id: string
  order_created_at: string
  buyer_full_name: string | null
  buyer_phone: string | null
  delivery_address: string | null
  delivery_city: string | null
  delivery_notes: string | null
  product_title: string
  quantity: number
  unit_price: number
  delivered_by_seller: boolean
  delivered_at: string | null
}

type DeliveryZone = {
  id: string
  location_value: string
  delivery_price: number
  delivery_time_days: number
  is_enabled: boolean
}

export default function SellerDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<SellerDeliveryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [zonesModalOpen, setZonesModalOpen] = useState(false)
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [loadingZones, setLoadingZones] = useState(false)
  const [selectedZoneForEdit, setSelectedZoneForEdit] = useState<DeliveryZone | null>(null)
  const [newZoneLocation, setNewZoneLocation] = useState('')
  const [newZonePrice, setNewZonePrice] = useState<string>('5')
  const [newZoneDays, setNewZoneDays] = useState<string>('2')
  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
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

      const res = await fetch('/api/seller/deliveries', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setError(payload?.error || 'Failed to load deliveries')
        setLoading(false)
        return
      }

      setDeliveries((payload?.deliveries ?? []) as SellerDeliveryRow[])
      setLoading(false)
    }

    load()
  }, [])

  const loadZones = async () => {
    setLoadingZones(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) return

      const res = await fetch('/api/seller/delivery-zones', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)
      if (res.ok) {
        setZones((payload?.zones ?? []) as DeliveryZone[])
      }
    } finally {
      setLoadingZones(false)
    }
  }

  const handleAddZone = async () => {
    if (!newZoneLocation || !newZonePrice || !newZoneDays) {
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) return

      const res = await fetch('/api/seller/delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location_value: newZoneLocation,
          delivery_price: parseFloat(newZonePrice),
          delivery_time_days: parseInt(newZoneDays),
        }),
      })

      const payload = await res.json().catch(() => null)
      if (res.ok) {
        setZones([...zones, payload.zone])
        setNewZoneLocation('')
        setNewZonePrice('5')
        setNewZoneDays('2')
      }
    } catch (err) {
      console.error('Failed to add zone:', err)
    }
  }

  const handleUpdateZone = async (zone: DeliveryZone) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) return

      const res = await fetch('/api/seller/delivery-zones', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: zone.id,
          delivery_price: zone.delivery_price,
          delivery_time_days: zone.delivery_time_days,
          is_enabled: zone.is_enabled,
        }),
      })

      if (res.ok) {
        setZones(zones.map(z => z.id === zone.id ? zone : z))
        setSelectedZoneForEdit(null)
      }
    } catch (err) {
      console.error('Failed to update zone:', err)
    }
  }

  const handleDeleteZone = async (zoneId: string) => {
    setDeletingZoneId(zoneId)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) return

      const res = await fetch('/api/seller/delivery-zones', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: zoneId }),
      })

      if (res.ok) {
        setZones(zones.filter(z => z.id !== zoneId))
      }
    } catch (err) {
      console.error('Failed to delete zone:', err)
    } finally {
      setDeletingZoneId(null)
    }
  }

  const handleOpenZonesModal = () => {
    setZonesModalOpen(true)
    loadZones()
  }

  const getLocationLabel = (locationValue: string) => {
    return ALL_LOCATIONS.find(l => l.value === locationValue)?.label || locationValue
  }

  const markDelivered = async (itemId: string) => {
    setUpdatingItemId(itemId)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        setError('Unauthorized')
        return
      }

      const res = await fetch('/api/seller/deliveries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item_id: itemId }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.error || 'Failed to mark delivered')
        return
      }

      const deliveredAt = (payload?.item?.delivered_at as string | undefined) ?? new Date().toISOString()
      setDeliveries((previous) =>
        previous.map((row) =>
          row.item_id === itemId
            ? {
                ...row,
                delivered_by_seller: true,
                delivered_at: deliveredAt,
              }
            : row
        )
      )
    } finally {
      setUpdatingItemId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Delivery Management</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your delivery zones and track buyer deliveries.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOpenZonesModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Settings className="h-4 w-4" />
              Delivery Zones
            </button>
            <Link href="/seller" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Delivery Orders</h2>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading deliveries…</p>
        ) : deliveries.length === 0 ? (
          <p className="text-sm text-gray-500">No delivery records yet.</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Order</th>
                  <th className="py-2">Product</th>
                  <th className="py-2">Buyer</th>
                  <th className="py-2">Delivery</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((row, index) => (
                  <tr key={`${row.order_id}-${row.item_id}-${index}`} className="border-t align-top">
                    <td className="py-2 whitespace-nowrap">{new Date(row.order_created_at).toLocaleString()}</td>
                    <td className="py-2">{row.order_id.slice(0, 8)}…</td>
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{row.product_title}</p>
                      <p className="text-xs text-gray-500">Qty: {row.quantity} · Unit: GH₵ {Number(row.unit_price).toLocaleString()}</p>
                    </td>
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{row.buyer_full_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{row.buyer_phone || 'No phone'}</p>
                    </td>
                    <td className="py-2">
                      <p className="text-gray-900">{row.delivery_address || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{row.delivery_city || 'No city'}</p>
                      {row.delivery_notes ? <p className="mt-1 text-xs text-gray-500">Note: {row.delivery_notes}</p> : null}
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      {row.delivered_by_seller ? (
                        <div>
                          <p className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Delivered</p>
                          {row.delivered_at ? <p className="mt-1 text-xs text-gray-500">{new Date(row.delivered_at).toLocaleString()}</p> : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markDelivered(row.item_id)}
                          disabled={updatingItemId === row.item_id}
                          className="rounded-md border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingItemId === row.item_id ? 'Saving…' : 'Mark Delivered'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delivery Zones Modal */}
      {zonesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Manage Delivery Zones</h2>
                <button
                  onClick={() => {
                    setZonesModalOpen(false)
                    setSelectedZoneForEdit(null)
                  }}
                  className="rounded-lg p-1 hover:bg-gray-100"
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-600">Set delivery prices and times for different locations in Ghana</p>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {loadingZones ? (
                <p className="text-center text-sm text-gray-500">Loading zones…</p>
              ) : (
                <>
                  {/* Existing Zones List */}
                  {zones.length > 0 && (
                    <div>
                      <h3 className="mb-3 font-semibold text-gray-900">Your Delivery Zones</h3>
                      <div className="space-y-2">
                        {zones.map((zone) => (
                          <div key={zone.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                            <div>
                              <p className="font-medium text-gray-900">{getLocationLabel(zone.location_value)}</p>
                              <p className="text-sm text-gray-600">GH₵{zone.delivery_price} • {zone.delivery_time_days} day(s)</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedZoneForEdit(zone)}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteZone(zone.id)}
                                disabled={deletingZoneId === zone.id}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingZoneId === zone.id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit Zone Form */}
                  {selectedZoneForEdit && (
                    <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                      <h4 className="font-semibold mb-3 text-gray-900">Edit Zone: {getLocationLabel(selectedZoneForEdit.location_value)}</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Price (GH₵)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={selectedZoneForEdit.delivery_price}
                            onChange={(e) => setSelectedZoneForEdit({
                              ...selectedZoneForEdit,
                              delivery_price: parseFloat(e.target.value) || 0
                            })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time (Days)</label>
                          <input
                            type="number"
                            min="1"
                            value={selectedZoneForEdit.delivery_time_days}
                            onChange={(e) => setSelectedZoneForEdit({
                              ...selectedZoneForEdit,
                              delivery_time_days: parseInt(e.target.value) || 1
                            })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedZoneForEdit.is_enabled}
                            onChange={(e) => setSelectedZoneForEdit({
                              ...selectedZoneForEdit,
                              is_enabled: e.target.checked
                            })}
                            className="rounded"
                          />
                          <label className="text-sm text-gray-700">Active</label>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleUpdateZone(selectedZoneForEdit)}
                            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setSelectedZoneForEdit(null)}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add New Zone Form */}
                  <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                    <h3 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Zone
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <select
                          value={newZoneLocation}
                          onChange={(e) => setNewZoneLocation(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="">Select a location</option>
                          {ALL_LOCATIONS.map((loc) => (
                            <option key={loc.value} value={loc.value}>
                              {loc.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Price (GH₵)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newZonePrice}
                          onChange={(e) => setNewZonePrice(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time (Days)</label>
                        <input
                          type="number"
                          min="1"
                          value={newZoneDays}
                          onChange={(e) => setNewZoneDays(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        onClick={handleAddZone}
                        disabled={!newZoneLocation}
                        className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Zone
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 sticky bottom-0">
              <button
                onClick={() => {
                  setZonesModalOpen(false)
                  setSelectedZoneForEdit(null)
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
