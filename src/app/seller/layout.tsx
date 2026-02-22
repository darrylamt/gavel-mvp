'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import SellerShell from '@/components/seller/SellerShell'

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'seller') {
        router.replace('/contact')
        return
      }

      setLoading(false)
    }

    checkAccess()
  }, [router])

  if (loading) {
    return <p className="p-6">Checking seller access…</p>
  }

  return <SellerShell>{children}</SellerShell>
}
