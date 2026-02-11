'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function NewAuction() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [extraImages, setExtraImages] = useState<FileList | null>(null)

  const createAuction = async () => {
  const { data: authData, error: authError } =
    await supabase.auth.getUser()

  console.log('AUTH DATA:', authData)
  console.log('AUTH ERROR:', authError)

  if (!authData?.user) {
    alert('Not logged in')
    return
  }
  // prepare payload with starts_at, reserve_price
  const starts_at_iso = startsAt ? new Date(startsAt).toISOString() : new Date().toISOString()
  const ends_at_iso = endsAt ? new Date(endsAt).toISOString() : null

  const payload: any = {
    title,
    starting_price: Number(price),
    current_price: Number(price),
    starts_at: starts_at_iso,
    ends_at: ends_at_iso,
    reserve_price: reservePrice ? Number(reservePrice) : null,
    seller_id: authData.user.id,
    status: startsAt && new Date(startsAt).getTime() > Date.now() ? 'scheduled' : 'active',
  }

  const { data, error } = await supabase
    .from('auctions')
    .insert(payload)
    .select()

  if (error || !data || data.length === 0) {
    alert(`Supabase error:\n${error?.message}`)
    return
  }

  const auction = data[0]

  // Upload images if provided
  const uploadedUrls: string[] = []

  try {
    if (imageFile) {
      console.log('Uploading primary auction image')
      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('auctionId', auction.id)

      const res = await fetch('/api/upload/auction-image', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Primary image upload failed')
      }

      const data = await res.json()
      uploadedUrls.push(data.url)
      console.log('Primary image uploaded:', data.url)
    }

    if (extraImages && extraImages.length > 0) {
      for (let i = 0; i < extraImages.length; i++) {
        const f = extraImages[i]
        console.log('Uploading extra image:', i + 1)

        const formData = new FormData()
        formData.append('file', f)
        formData.append('auctionId', auction.id)

        const res = await fetch('/api/upload/auction-image', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || `Extra image ${i + 1} upload failed`)
        }

        const data = await res.json()
        uploadedUrls.push(data.url)
        console.log('Extra image uploaded:', data.url)
      }
    }

    // Update auction with image_url (first) and images (array)
    if (uploadedUrls.length > 0) {
      const { error: updateErr } = await supabase
        .from('auctions')
        .update({ image_url: uploadedUrls[0], images: uploadedUrls })
        .eq('id', auction.id)

      if (updateErr) {
        console.error('Auction update error:', updateErr)
        throw new Error(`Auction update failed: ${updateErr.message}`)
      }
    }

    alert('Auction created successfully')
    router.push(`/auctions/${auction.id}`)
  } catch (err: any) {
    console.error('Upload error', err)
    alert(`Failed to complete auction creation: ${err.message}`)
  }
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
        placeholder="Reserve Price (GHS)"
        type="number"
        className="border p-2 w-full mb-2"
        onChange={(e) => setReservePrice(e.target.value)}
      />

      <label className="block text-sm text-gray-600 mb-1">Start Time</label>
      <input
        type="datetime-local"
        className="border p-2 w-full mb-4"
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
      />

      <label className="block text-sm text-gray-600 mb-1">End Time</label>
      <input
        type="datetime-local"
        className="border p-2 w-full mb-4"
        value={endsAt}
        onChange={(e) => setEndsAt(e.target.value)}
      />

      <label className="block text-sm text-gray-600 mb-1">Primary Image</label>
      <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="mb-2" />

      <label className="block text-sm text-gray-600 mb-1">Additional Images</label>
      <input type="file" accept="image/*" multiple onChange={(e) => setExtraImages(e.target.files)} className="mb-4" />

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