'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: auth } = await supabase.auth.getUser()

      if (!auth.user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      setIsAdmin(profile?.role === 'admin')
      setLoading(false)
    }

    checkAdmin()
  }, [])

  if (loading) {
    return <p className="p-6">Loading admin panel…</p>
  }

  if (!isAdmin) {
    return (
      <main className="p-10 text-center">
        <h1 className="text-2xl font-bold text-red-600">
          Access Denied
        </h1>
        <p className="mt-2 text-gray-600">
          You do not have permission to view this page.
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Admin Dashboard
      </h1>

      <p className="text-gray-600">
        Welcome, Admin. More tools coming soon.
      </p>
    </main>
  )
}
