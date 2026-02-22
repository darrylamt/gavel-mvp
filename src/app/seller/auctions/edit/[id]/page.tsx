'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/base/input/input'

type AuctionRecord = {
  id: string
  title: string
  description: string | null
  starting_price: number
  reserve_price: number | null
  min_increment: number | null
  max_increment: number | null
  starts_at: string | null
  ends_at: string | null
  status: string | null
}

export default function SellerEditAuctionPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [minIncrement, setMinIncrement] = useState('')
  const [maxIncrement, setMaxIncrement] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  const hasStarted = useMemo(() => {
    if (!startsAt) return true
    return new Date(startsAt).getTime() <= Date.now()
  }, [startsAt])

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token || !id) {
        setError('Unauthorized')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/seller/auction/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Failed to load auction')
        setLoading(false)
        return
      }

      const auction = data.auction as AuctionRecord
      setTitle(auction.title || '')
      setDescription(auction.description || '')
      setStartingPrice(String(auction.starting_price ?? ''))
      setReservePrice(auction.reserve_price != null ? String(auction.reserve_price) : '')
      setMinIncrement(auction.min_increment != null ? String(auction.min_increment) : '')
      setMaxIncrement(auction.max_increment != null ? String(auction.max_increment) : '')
      setStartsAt(auction.starts_at ? new Date(auction.starts_at).toISOString().slice(0, 16) : '')
      setEndsAt(auction.ends_at ? new Date(auction.ends_at).toISOString().slice(0, 16) : '')
      setLoading(false)
    }

    load()
  }, [id])

  const saveChanges = async () => {
    if (!id) return

    setSaving(true)
    setError(null)

    try {
      if (!title.trim()) throw new Error('Title required')
      if (!description.trim()) throw new Error('Description required')
      if (!startingPrice) throw new Error('Starting price required')
      if (!startsAt || !endsAt) throw new Error('Start and end time are required')
      if (hasStarted) throw new Error('Only auctions that have not started can be edited.')

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Unauthorized')

      const res = await fetch(`/api/seller/auction/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          starting_price: Number(startingPrice),
          reserve_price: reservePrice ? Number(reservePrice) : null,
          min_increment: minIncrement ? Number(minIncrement) : 1,
          max_increment: maxIncrement ? Number(maxIncrement) : null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save changes')
      }

      router.push('/seller/auctions')
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update auction')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="p-6">Loading auction…</p>
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Edit Auction</h1>
      <p className="mb-6 text-gray-600">Only auctions that have not started can be edited.</p>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="space-y-6 rounded-lg border bg-white p-6">
        <Input label="Product Name" value={title} onChange={(event) => setTitle(event.target.value)} isRequired />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Description
            <span className="ml-1 text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={8}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Starting Price (GHS)" type="number" value={startingPrice} onChange={(event) => setStartingPrice(event.target.value)} isRequired />
          <Input label="Reserve Price (GHS)" type="number" value={reservePrice} onChange={(event) => setReservePrice(event.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Minimum Bid Increment (GHS)" type="number" value={minIncrement} onChange={(event) => setMinIncrement(event.target.value)} />
          <Input label="Maximum Bid Increment (GHS)" type="number" value={maxIncrement} onChange={(event) => setMaxIncrement(event.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Start Time" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} isRequired />
          <Input label="End Time" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} isRequired />
        </div>

        <div className="flex gap-3 border-t pt-4">
          <button onClick={() => router.push('/seller/auctions')} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={saveChanges} disabled={saving || hasStarted} className="flex-1 rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </main>
  )
}
