'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function NewAuction() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [endTime, setEndTime] = useState('')

  const createAuction = async () => {
    const { data: user } = await supabase.auth.getUser()

    await supabase.from('auctions').insert({
      title,
      starting_price: price,
      current_price: price,
      end_time: endTime,
      seller_id: user.user?.id,
    })

    router.push('/auctions')
  }

  return (
    <main className="p-10 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Create Auction</h1>

      <input
        placeholder="Title"
        className="border p-2 w-full mb-2"
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        placeholder="Starting Price (GHS)"
        type="number"
        className="border p-2 w-full mb-2"
        onChange={(e) => setPrice(e.target.value)}
      />

      <input
        type="datetime-local"
        className="border p-2 w-full mb-4"
        onChange={(e) => setEndTime(e.target.value)}
      />

      <button
        onClick={createAuction}
        className="bg-black text-white p-2 w-full"
      >
        Create
      </button>
    </main>
  )
}