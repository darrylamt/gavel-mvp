'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { AlertCircle, Truck, Plus, Trash2 } from 'lucide-react'
import LocationDropdown from '@/components/ui/LocationDropdown'
import Toggle from '@/components/ui/toggle'
import { ALL_LOCATIONS, type Location } from '@/lib/ghanaLocations'

interface DeliveryZone {
  id: string
  location_value: string
  delivery_price: number
  delivery_time_days: number
  is_enabled: boolean
}

export default function SellerDeliveryZones() {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newZone, setNewZone] = useState({
    location_value: '',
    delivery_price: 5,
    delivery_time_days: 2,
    is_enabled: true,
  })

  useEffect(() => {
    fetchZones()
  }, [])

  const fetchZones = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/seller/delivery-zones', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch zones')
      }

      const data = await response.json()
      setZones(data.zones || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching zones:', err)
      setError(err instanceof Error ? err.message : 'Failed to load delivery zones')
    } finally {
      setLoading(false)
    }
  }

  const handlePriceChange = (zoneId: string, newPrice: number) => {
    setZones(zones.map(z => z.id === zoneId ? { ...z, delivery_price: newPrice } : z))
  }

  const handleTimeChange = (zoneId: string, newTime: number) => {
    setZones(zones.map(z => z.id === zoneId ? { ...z, delivery_time_days: newTime } : z))
  }

  const handleToggle = (zoneId: string) => {
    setZones(zones.map(z => z.id === zoneId ? { ...z, is_enabled: !z.is_enabled } : z))
  }

  const handleSave = async (zone: DeliveryZone) => {
    try {
      setSaving(zone.id)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/seller/delivery-zones', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: zone.id,
          delivery_price: zone.delivery_price,
          delivery_time_days: zone.delivery_time_days,
          is_enabled: zone.is_enabled,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update zone')
      }

      const locationLabel = ALL_LOCATIONS.find(l => l.value === zone.location_value)?.label
      setSuccess(`${locationLabel || 'Location'} updated successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving zone:', err)
      setError(err instanceof Error ? err.message : 'Failed to save zone')
    } finally {
      setSaving(null)
    }
  }

  const handleAdd = async () => {
    if (!newZone.location_value) {
      setError('Please select a location')
      return
    }

    try {
      setSaving('new')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/seller/delivery-zones', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newZone),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add zone')
      }

      setSuccess('Delivery zone added successfully')
      setTimeout(() => setSuccess(null), 3000)
      setShowAddForm(false)
      setNewZone({
        location_value: '',
        delivery_price: 5,
        delivery_time_days: 2,
        is_enabled: true,
      })
      fetchZones()
    } catch (err) {
      console.error('Error adding zone:', err)
      setError(err instanceof Error ? err.message : 'Failed to add zone')
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this delivery zone?')) return

    try {
      setDeleting(zoneId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/seller/delivery-zones', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: zoneId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete zone')
      }

      setSuccess('Delivery zone deleted')
      setTimeout(() => setSuccess(null), 3000)
      fetchZones()
    } catch (err) {
      console.error('Error deleting zone:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete zone')
    } finally {
      setDeleting(null)
    }
  }

  const availableLocations = ALL_LOCATIONS.filter(
    loc => !zones.some(z => z.location_value === loc.value)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery zones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Delivery Zones & Pricing</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Set delivery prices and times for different locations in Ghana.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-700 hover:text-red-900 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-semibold text-green-900">{success}</p>
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Delivery Zone</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <LocationDropdown
                locations={availableLocations}
                value={newZone.location_value}
                onChange={(value) => setNewZone({ ...newZone, location_value: value })}
                placeholder="Select a location..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Price (GHS)
                </label>
                <input
                  type="number"
                  value={newZone.delivery_price}
                  onChange={(e) => setNewZone({ ...newZone, delivery_price: parseFloat(e.target.value) || 0 })}
                  step="0.50"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Time (days)
                </label>
                <input
                  type="number"
                  value={newZone.delivery_time_days}
                  onChange={(e) => setNewZone({ ...newZone, delivery_time_days: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Enabled:</label>
              <Toggle
                checked={newZone.is_enabled}
                onChange={(checked) => setNewZone({ ...newZone, is_enabled: checked })}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving === 'new'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving === 'new' ? 'Adding...' : 'Add Zone'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewZone({
                    location_value: '',
                    delivery_price: 5,
                    delivery_time_days: 2,
                    is_enabled: true,
                  })
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {zones.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No delivery zones configured yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add Your First Zone
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone) => {
            const locationLabel = ALL_LOCATIONS.find(l => l.value === zone.location_value)?.label
            return (
              <div
                key={zone.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{locationLabel}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={zone.is_enabled}
                      onChange={() => handleToggle(zone.id)}
                    />
                    <button
                      onClick={() => handleDelete(zone.id)}
                      disabled={deleting === zone.id}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="Delete zone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Delivery Price (GHS)
                    </label>
                    <input
                      type="number"
                      value={zone.delivery_price}
                      onChange={(e) => handlePriceChange(zone.id, parseFloat(e.target.value) || 0)}
                      step="0.50"
                      min="0"
                      disabled={!zone.is_enabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Delivery Time (days)
                    </label>
                    <input
                      type="number"
                      value={zone.delivery_time_days}
                      onChange={(e) => handleTimeChange(zone.id, parseInt(e.target.value) || 1)}
                      min="1"
                      disabled={!zone.is_enabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleSave(zone)}
                  disabled={saving === zone.id}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving === zone.id ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> Disabling a location prevents customers from selecting it at checkout. You can add multiple locations and set different prices for each.
        </p>
      </div>
    </div>
  )
}
