'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function NewAuction() {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const router = useRouter()

  const createAuction = async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { error } = await supabase.from('auctions').insert({
      title,
      starting_price: Number(price),
      current_price: Number(price),
      ends_at: new Date(endsAt).toISOString(),
      seller_id: auth.user.id,
    })

    if (error) {
      alert(error.message)
      return
    }

    router.push('/admin')
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Create Auction</h1>

      <input
        placeholder="Title"
        className="border p-2 w-full mb-3"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        type="number"
        placeholder="Starting price"
        className="border p-2 w-full mb-3"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      <input
        type="datetime-local"
        className="border p-2 w-full mb-4"
        value={endsAt}
        onChange={(e) => setEndsAt(e.target.value)}
      />

      <button
        onClick={createAuction}
        className="bg-black text-white px-4 py-2"
      >
        Create
      </button>
    </main>
  )
}
