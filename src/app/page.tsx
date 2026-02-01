'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login')
      }
      setLoading(false)
    })
  }, [router])

  if (loading) return <p className="p-10">Loading...</p>

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">Welcome to Gavel</h1>
      <p>You are logged in.</p>
    </main>
  )
}