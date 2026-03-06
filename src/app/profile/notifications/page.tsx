'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthGuard } from '@/hooks/useAuthGuard'

type NotificationPreferences = {
  // Opt-in/out
  sms_opt_in: boolean
  sms_marketing_opt_in: boolean
  
  // Countdown notifications
  sms_auction_countdown_10h: boolean
  sms_auction_countdown_5h: boolean
  sms_auction_countdown_1h: boolean
  sms_auction_countdown_30m: boolean
  sms_auction_countdown_5m: boolean
  
  // Activity notifications
  sms_bid_updates: boolean
  sms_auction_won: boolean
  sms_outbid: boolean
  sms_payment_reminders: boolean
  sms_shipping_updates: boolean
}

export default function NotificationSettingsPage() {
  const { user, loading: authLoading } = useAuthGuard()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user) return

    const loadPreferences = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          sms_opt_in,
          sms_marketing_opt_in,
          sms_auction_countdown_10h,
          sms_auction_countdown_5h,
          sms_auction_countdown_1h,
          sms_auction_countdown_30m,
          sms_auction_countdown_5m,
          sms_bid_updates,
          sms_auction_won,
          sms_outbid,
          sms_payment_reminders,
          sms_shipping_updates
        `)
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setPreferences(data as NotificationPreferences)
      }
      setLoading(false)
    }

    loadPreferences()
  }, [user])

  const handleSave = async () => {
    if (!user || !preferences) return

    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('profiles')
      .update(preferences)
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences' })
    } else {
      setMessage({ type: 'success', text: 'Notification preferences saved!' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-gray-600">Loading preferences...</p>
        </div>
      </main>
    )
  }

  if (!preferences) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-red-600">Failed to load notification preferences</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
          <p className="mt-2 text-gray-600">Manage your SMS notification preferences</p>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-lg border p-4 ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* General Settings */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">General SMS Notifications</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_opt_in}
                  onChange={(e) => updatePreference('sms_opt_in', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="block font-medium text-gray-900">Enable SMS Notifications</span>
                  <span className="text-sm text-gray-600">
                    Receive transactional SMS for bids, auctions, and payments
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_marketing_opt_in}
                  onChange={(e) => updatePreference('sms_marketing_opt_in', e.target.checked)}
                  disabled={!preferences.sms_opt_in}
                  className="mt-1 h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                />
                <div>
                  <span className="block font-medium text-gray-900">Marketing Messages</span>
                  <span className="text-sm text-gray-600">Receive promotional SMS about new auctions</span>
                </div>
              </label>
            </div>
          </div>

          {/* Auction Countdown */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">⏰ Auction Countdown Alerts</h2>
            <p className="mb-4 text-sm text-gray-600">
              Get SMS reminders when auctions you're bidding on are ending soon
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_auction_countdown_10h}
                  onChange={(e) => updatePreference('sms_auction_countdown_10h', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-gray-900">10 hours before auction ends</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_auction_countdown_5h}
                  onChange={(e) => updatePreference('sms_auction_countdown_5h', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-gray-900">5 hours before auction ends</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_auction_countdown_1h}
                  onChange={(e) => updatePreference('sms_auction_countdown_1h', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-gray-900">1 hour before auction ends</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_auction_countdown_30m}
                  onChange={(e) => updatePreference('sms_auction_countdown_30m', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-gray-900">30 minutes before auction ends</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_auction_countdown_5m}
                  onChange={(e) => updatePreference('sms_auction_countdown_5m', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="font-medium text-gray-900">5 minutes before auction ends ⚡</span>
              </label>
            </div>
          </div>

          {/* Activity Notifications */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">📢 Activity Notifications</h2>
            <p className="mb-4 text-sm text-gray-600">Stay updated on your auction activity</p>
            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_bid_updates}
                  onChange={(e) => updatePreference('sms_bid_updates', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="block font-medium text-gray-900">Bid Updates</span>
                  <span className="text-sm text-gray-600">When you place a bid or become the highest bidder</span>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_outbid}
                  onChange={(e) => updatePreference('sms_outbid', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="block font-medium text-gray-900">Outbid Alerts</span>
                  <span className="text-sm text-gray-600">When someone outbids you</span>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_auction_won}
                  onChange={(e) => updatePreference('sms_auction_won', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="block font-medium text-gray-900">Auction Won 🎉</span>
                  <span className="text-sm text-gray-600">When you win an auction</span>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_payment_reminders}
                  onChange={(e) => updatePreference('sms_payment_reminders', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="block font-medium text-gray-900">Payment Reminders</span>
                  <span className="text-sm text-gray-600">Reminders to pay for won auctions</span>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.sms_shipping_updates}
                  onChange={(e) => updatePreference('sms_shipping_updates', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="block font-medium text-gray-900">Shipping & Delivery</span>
                  <span className="text-sm text-gray-600">Updates on item shipping and delivery status</span>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
