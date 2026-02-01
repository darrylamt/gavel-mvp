'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function NewAuction() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [endTime, setEndTime] = useState('')

  const createAuction = async () => {
  const { data: authData, error: authError } =
    await supabase.auth.getUser()

  console.log('AUTH DATA:', authData)
  console.log('AUTH ERROR:', authError)

  if (!authData?.user) {
    alert('Not logged in')
    return
  }

  const payload = {
    title,
    starting_price: Number(price),
    current_price: Number(price),
    ends_at: new Date(endsAt).toISOString(),
    seller_id: authData.user.id,
  }

  console.log('INSERT PAYLOAD:', payload)

  const { data, error } = await supabase
    .from('auctions')
    .insert(payload)
    .select()

  console.log('INSERT RESULT DATA:', data)
  console.log('INSERT RESULT ERROR:', error)

  if (error) {
    alert(
      `Supabase error:\n${error.message}\n\nDetails:\n${error.details}`
    )
    return
  }

  alert('Auction created successfully')
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
        value={endsAt}
        onChange={(e) => setEndsAt(e.target.value)}
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