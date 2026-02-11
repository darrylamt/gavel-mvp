'use client'

import { useEffect, useState } from 'react'

export default function InitStoragePage() {
  const [status, setStatus] = useState('Initializing storage...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initStorage = async () => {
      try {
        const res = await fetch('/api/init/storage', { method: 'POST' })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to initialize storage')
          setStatus('Error initializing storage')
          return
        }

        setStatus(`Success: ${data.message}`)
        console.log(data)
      } catch (err: any) {
        setError(err.message || 'Unknown error')
        setStatus('Error initializing storage')
      }
    }

    initStorage()
  }, [])

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Initialize Storage</h1>
      <p className="text-gray-700 mb-4">{status}</p>
      {error && <p className="text-red-600 font-semibold">{error}</p>}
    </main>
  )
}
