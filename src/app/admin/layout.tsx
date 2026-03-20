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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Checking access…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
