'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAdmin } from '@/lib/isAdmin'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    isAdmin().then((ok) => {
      if (!ok) router.replace('/')
      else setLoading(false)
    })
  }, [])

  if (loading) return <p className="p-6">Checking access…</p>

  return <>{children}</>
}
