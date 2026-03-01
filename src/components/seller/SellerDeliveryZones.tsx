'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { AlertCircle, Truck, DollarSign } from 'lucide-react'

interface DeliveryZone {
  id: string
  zone_name: string
  delivery_price: number
  is_enabled: boolean
}

export default function SellerDeliveryZones() {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
          is_enabled: zone.is_enabled,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update zone')
      }

      setSuccess(`${zone.zone_name} updated successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving zone:', err)
      setError(err instanceof Error ? err.message : 'Failed to save zone')
    } finally {
      setSaving(null)
    }
  }

  const zoneDescriptions: Record<string, string> = {
    'Greater Accra': 'Delivery within Central Accra (Osu, Labone, Cantonments, etc.)',
    'Greater Accra Towns': 'Delivery to Accra suburbs (Kasoa, Labadi, Teshie, etc.)',
    'Other Regions': 'Delivery outside Greater Accra (Kumasi, Sekondi, Cape Coast, etc.)',
  }

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
        <div className="flex items-center gap-2 mb-2">
          <Truck className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Delivery Zones & Pricing</h2>
        </div>
        <p className="text-sm text-gray-600">
          Configure delivery prices for different regions. You can disable delivery to regions you don't serve.
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

      <div className="space-y-4">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{zone.zone_name}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      zone.is_enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {zone.is_enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{zoneDescriptions[zone.zone_name]}</p>
              </div>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={zone.is_enabled}
                  onChange={() => handleToggle(zone.id)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="sr-only">Toggle delivery to {zone.zone_name}</span>
              </label>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-700">Delivery Price:</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">GHS</span>
                  <input
                    type="number"
                    value={zone.delivery_price}
                    onChange={(e) => handlePriceChange(zone.id, parseFloat(e.target.value) || 0)}
                    step="0.50"
                    min="0"
                    disabled={!zone.is_enabled}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              <button
                onClick={() => handleSave(zone)}
                disabled={saving === zone.id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
              >
                {saving === zone.id ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> Disabling a delivery zone means customers won't be able to select this zone at checkout. This is useful if you only deliver within Accra, for example.
        </p>
      </div>
    </div>
  )
}
