'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface Item {
  key: string
  label: string
  completed: boolean
  link: string
}

export default function SellerProfileNotification() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, { count: payoutCount }] = await Promise.all([
        supabase.from('profiles').select('phone, address').eq('id', user.id).single(),
        supabase
          .from('seller_payout_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', user.id),
      ])

      setItems([
        {
          key: 'phone',
          label: 'Add phone number',
          completed: !!profile?.phone,
          link: '/profile',
        },
        {
          key: 'address',
          label: 'Set pickup address',
          completed: !!profile?.address,
          link: '/profile',
        },
        {
          key: 'payout',
          label: 'Add a payout account',
          completed: (payoutCount ?? 0) > 0,
          link: '/seller/settings/payouts',
        },
      ])
    }
    check()
  }, [])

  const incomplete = items.filter((i) => !i.completed)
  if (!items.length || !incomplete.length) return null

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          {incomplete.length} setup step{incomplete.length !== 1 ? 's' : ''} remaining
        </p>
        <ul className="mt-1.5 space-y-1">
          {incomplete.map((item) => (
            <li key={item.key}>
              <Link
                href={item.link}
                className="inline-flex items-center gap-1 text-sm text-amber-800 underline underline-offset-2 hover:text-amber-700"
              >
                {item.label} <ArrowRight className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => setItems(items.map((i) => ({ ...i, completed: true })))}
        className="text-amber-600 hover:text-amber-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
