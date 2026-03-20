'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Toggle from '@/components/ui/toggle'

type NotificationPreferences = {
  sms_opt_in: boolean
  sms_marketing_opt_in: boolean
  sms_auction_countdown_10h: boolean
  sms_auction_countdown_5h: boolean
  sms_auction_countdown_1h: boolean
  sms_auction_countdown_30m: boolean
  sms_auction_countdown_5m: boolean
  sms_bid_updates: boolean
  sms_auction_won: boolean
  sms_outbid: boolean
  sms_payment_reminders: boolean
  sms_shipping_updates: boolean
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-start justify-between gap-4 py-3.5 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0 pt-0.5">
        <Toggle checked={checked} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="px-5 divide-y divide-gray-50">{children}</div>
    </div>
  )
}

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthGuard()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const [browserNotifications, setBrowserNotifications] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('browserNotifications')
      return stored === null ? true : stored === 'true'
    }
    return true
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('browserNotifications', browserNotifications ? 'true' : 'false')
    }
  }, [browserNotifications])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          sms_opt_in, sms_marketing_opt_in,
          sms_auction_countdown_10h, sms_auction_countdown_5h,
          sms_auction_countdown_1h, sms_auction_countdown_30m,
          sms_auction_countdown_5m, sms_bid_updates,
          sms_auction_won, sms_outbid,
          sms_payment_reminders, sms_shipping_updates
        `)
        .eq('id', user.id)
        .single()
      if (!error && data) setPreferences(data as NotificationPreferences)
      setLoading(false)
    }
    load()
  }, [user])

  const handleSave = async () => {
    if (!user || !preferences) return
    setSaving(true)
    setSaved(false)
    setSaveError(false)
    const { error } = await supabase.from('profiles').update(preferences).eq('id', user.id)
    setSaving(false)
    if (error) {
      setSaveError(true)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const set = (key: keyof NotificationPreferences) => (val: boolean) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: val })
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <p className="text-sm text-red-600">Failed to load settings.</p>
      </div>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your notification preferences and account.</p>
      </div>

      <div className="space-y-4">

        {/* Browser */}
        <Section title="🔔 Browser Notifications">
          <SettingRow
            title="Browser pop-up alerts"
            description="Allow Gavel to show in-browser notifications for bids and updates"
            checked={browserNotifications}
            onChange={setBrowserNotifications}
          />
          {browserNotifications && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied' && (
            <p className="text-xs text-red-500 pb-3">Notifications are blocked in your browser settings. Please enable them manually.</p>
          )}
        </Section>

        {/* SMS General */}
        <Section title="📱 SMS Notifications" description="Receive transactional messages on your phone">
          <SettingRow
            title="Enable SMS Notifications"
            description="Bid confirmations, auction updates, payments, and deliveries via SMS"
            checked={preferences.sms_opt_in}
            onChange={set('sms_opt_in')}
          />
          <SettingRow
            title="Marketing Messages"
            description="New auctions, promotions, and special offers"
            checked={preferences.sms_marketing_opt_in}
            onChange={set('sms_marketing_opt_in')}
            disabled={!preferences.sms_opt_in}
          />
        </Section>

        {/* Countdown */}
        <Section title="⏰ Auction Countdown Alerts" description="SMS reminders when auctions you're watching are ending soon">
          <SettingRow title="10 hours before end" checked={preferences.sms_auction_countdown_10h} onChange={set('sms_auction_countdown_10h')} />
          <SettingRow title="5 hours before end" checked={preferences.sms_auction_countdown_5h} onChange={set('sms_auction_countdown_5h')} />
          <SettingRow title="1 hour before end" checked={preferences.sms_auction_countdown_1h} onChange={set('sms_auction_countdown_1h')} />
          <SettingRow title="30 minutes before end" checked={preferences.sms_auction_countdown_30m} onChange={set('sms_auction_countdown_30m')} />
          <SettingRow title="5 minutes before end ⚡" checked={preferences.sms_auction_countdown_5m} onChange={set('sms_auction_countdown_5m')} />
        </Section>

        {/* Activity */}
        <Section title="📢 Activity Alerts" description="Stay updated on your bidding and shopping activity">
          <SettingRow
            title="Bid Updates"
            description="When you place a bid or become the highest bidder"
            checked={preferences.sms_bid_updates}
            onChange={set('sms_bid_updates')}
          />
          <SettingRow
            title="Outbid Alerts"
            description="Instantly notified when someone outbids you"
            checked={preferences.sms_outbid}
            onChange={set('sms_outbid')}
          />
          <SettingRow
            title="Auction Won"
            description="Congratulations notification when you win"
            checked={preferences.sms_auction_won}
            onChange={set('sms_auction_won')}
          />
          <SettingRow
            title="Payment Reminders"
            description="Payment confirmations and pending payment alerts"
            checked={preferences.sms_payment_reminders}
            onChange={set('sms_payment_reminders')}
          />
          <SettingRow
            title="Shipping & Delivery"
            description="Tracking updates and delivery confirmations"
            checked={preferences.sms_shipping_updates}
            onChange={set('sms_shipping_updates')}
          />
        </Section>

        {/* Account */}
        <Section title="Account">
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-semibold text-gray-900">Password</p>
              <p className="text-xs text-gray-500">Change your account password</p>
            </div>
            <button
              onClick={() => router.push('/profile/change-password')}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Change
            </button>
          </div>
        </Section>

        {/* Save */}
        <div className="flex items-center justify-between pt-2">
          {saved && <p className="text-sm font-semibold text-green-600">✓ Saved successfully</p>}
          {saveError && <p className="text-sm text-red-600">Failed to save. Try again.</p>}
          {!saved && !saveError && <span />}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

      </div>
    </main>
  )
}
