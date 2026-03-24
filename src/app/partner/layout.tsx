'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.replace('/')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      const role = profile?.role
      if (role === 'partner' || role === 'admin') {
        setLoading(false)
      } else {
        router.replace('/')
      }
    }

    checkAccess()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Checking access…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
