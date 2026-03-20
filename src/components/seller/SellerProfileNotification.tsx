'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useTopToast } from '@/components/ui/TopToastProvider'

interface ProfileCompletionItem {
  key: string
  label: string
  completed: boolean
  link: string
}

export default function SellerProfileNotification() {
  const { notify } = useTopToast()
  const [isVisible, setIsVisible] = useState(false)
  const [completionItems, setCompletionItems] = useState<ProfileCompletionItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkProfileCompletion = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, address, delivery_location')
        .eq('id', session.user.id)
        .single()

      const { data: sellerApp } = await supabase
        .from('seller_applications')
        .select('status')
        .eq('user_id', session.user.id)
        .eq('status', 'approved')
        .maybeSingle()

      const { count: deliveryZonesCount } = await supabase
        .from('seller_delivery_zones')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', session.user.id)
        .eq('is_enabled', true)

      const { count: payoutMethodsCount } = await supabase
        .from('seller_payout_methods')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', session.user.id)

      const items: ProfileCompletionItem[] = [
        {
          key: 'phone',
          label: 'Add phone number',
          completed: !!profile?.phone,
          link: '/profile',
        },
        {
          key: 'address',
          label: 'Set home address',
          completed: !!profile?.address,
          link: '/profile',
        },
        {
          key: 'delivery_location',
          label: 'Set default delivery location',
          completed: !!profile?.delivery_location,
          link: '/profile',
        },
        {
          key: 'delivery_zones',
          label: 'Set delivery zones and prices',
          completed: (deliveryZonesCount ?? 0) > 0,
          link: '/seller/shop',
        },
        {
          key: 'payout_method',
          label: 'Add payout method',
          completed: (payoutMethodsCount ?? 0) > 0,
          link: '/seller/settings/payouts',
        },
      ]

      setCompletionItems(items)
      setIsVisible(items.some(item => !item.completed))
    }

    checkProfileCompletion()
  }, [])

  const handleSendReminder = async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return

      const incompleteItems = completionItems.filter(item => !item.completed)
      const message = `Please complete your seller profile:\n${incompleteItems.map(item => `- ${item.label}`).join('\n')}\n\nVisit your seller dashboard to complete these items.`

      // Send SMS if phone number exists
      if (completionItems.find(item => item.key === 'phone')?.completed) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', session.user.id)
          .single()

        if (profile?.phone) {
          const { data: authToken } = await supabase.auth.getSession()
          await fetch('/api/sms/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken.session?.access_token}`,
            },
            body: JSON.stringify({
              phone: profile.phone,
              message,
            }),
          })
        }
      }

      // Send email
      const { data: authToken } = await supabase.auth.getSession()
      await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken.session?.access_token}`,
        },
        body: JSON.stringify({
          to: session.user.email,
          subject: 'Complete Your Gavel Seller Profile',
          html: `
            <h2>Complete Your Seller Profile</h2>
            <p>Please complete the following items to fully set up your seller account:</p>
            <ul>
              ${incompleteItems.map(item => `<li>${item.label}</li>`).join('')}
            </ul>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/seller">Go to Seller Dashboard</a></p>
          `,
        }),
      })

      notify({
        title: 'Reminder Sent',
        description: 'Profile completion reminder has been sent to your email and phone.',
        variant: 'success',
      })
    } catch (error) {
      console.error('Failed to send reminder:', error)
      notify({
        title: 'Failed to Send Reminder',
        description: 'Please try again later.',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  const incompleteCount = completionItems.filter(item => !item.completed).length

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900">Complete Your Seller Profile</h3>
            <p className="mt-1 text-sm text-blue-700">
              {incompleteCount} item{incompleteCount === 1 ? '' : 's'} remaining to fully set up your seller account.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              {completionItems.filter(item => !item.completed).map(item => (
                <li key={item.key}>
                  • <a href={item.link} className="underline hover:no-underline">{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-blue-600 hover:text-blue-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSendReminder}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reminder'}
        </button>
        <a
          href="/seller/shop"
          className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
        >
          Complete Now
        </a>
      </div>
    </div>
  )
}