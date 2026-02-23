'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import SellerShell from '@/components/seller/SellerShell'

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isSeller, setIsSeller] = useState(false)

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
        .maybeSingle()

      let sellerRole = profile?.role === 'seller'

      if (!sellerRole) {
        const { data: activeShop } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        sellerRole = !!activeShop
      }

      const isSellerApplyPage = pathname === '/seller/apply'

      if (!sellerRole && !isSellerApplyPage) {
        router.replace('/contact')
        return
      }

      setIsSeller(sellerRole)
      setLoading(false)
    }

    checkAccess()
  }, [pathname, router])

  if (loading) {
    return <p className="p-6">Checking seller access…</p>
  }

  if (!isSeller) {
    return <>{children}</>
  }

  return <SellerShell>{children}</SellerShell>
}
