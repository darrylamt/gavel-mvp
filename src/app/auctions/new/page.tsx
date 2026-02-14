'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/base/input/input'
import { FileUpload, getReadableFileSize } from '@/components/base/file-upload/file-upload'

export default function NewAuction() {
  const router = useRouter()
  
  /* Form state */
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [minIncrement, setMinIncrement] = useState('')
  const [maxIncrement, setMaxIncrement] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDropFiles = (files: FileList) => {
    const newFiles = Array.from(files).map((f) => ({
      id: Math.random().toString(),
      name: f.name,
      size: f.size,
      type: f.type,
      progress: 100,
      fileObject: f,
    }))
    setUploadedFiles([...uploadedFiles, ...newFiles])
  }

  const handleDeleteFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== id))
  }

  const createAuction = async () => {
    setLoading(true)
    setError(null)

    try {
      /* Validate form */
      if (!title.trim()) throw new Error('Product name is required')
      if (!description.trim()) throw new Error('Description is required')
      if (!startingPrice) throw new Error('Starting price is required')
      if (!startsAt) throw new Error('Start time is required')
      if (!endsAt) throw new Error('End time is required')

      const startTime = new Date(startsAt).getTime()
      const endTime = new Date(endsAt).getTime()
      const now = Date.now()

      if (startTime < now) throw new Error('Start time must be in the future')
      if (endTime <= startTime) throw new Error('End time must be after start time')

      /* Get auth user */
      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user) throw new Error('Not logged in')

      /* Create auction */
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        starting_price: Number(startingPrice),
        current_price: Number(startingPrice),
        reserve_price: reservePrice ? Number(reservePrice) : null,
        min_increment: minIncrement ? Number(minIncrement) : 1,
        max_increment: maxIncrement ? Number(maxIncrement) : null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        seller_id: authData.user.id,
        status: startTime > now ? 'scheduled' : 'active',
      }

      console.log('Creating auction:', payload)

      const { data, error: insertErr } = await supabase
        .from('auctions')
        .insert(payload)
        .select()

      if (insertErr || !data || data.length === 0) {
        throw new Error(insertErr?.message || 'Failed to create auction')
      }

      const auction = data[0]
      console.log('Auction created:', auction.id)

      /* Upload images */
      const uploadedUrls: string[] = []

      for (const file of uploadedFiles) {
        const formData = new FormData()
        formData.append('file', file.fileObject)
        formData.append('auctionId', auction.id)

        const res = await fetch('/api/upload/auction-image', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Image upload failed')
        }

        const data = await res.json()
        uploadedUrls.push(data.url)
        console.log('Image uploaded:', data.url)
      }

      /* Update auction with images */
      if (uploadedUrls.length > 0) {
        const { error: updateErr } = await supabase
          .from('auctions')
          .update({ image_url: uploadedUrls[0], images: uploadedUrls })
          .eq('id', auction.id)

        if (updateErr) throw new Error(`Update failed: ${updateErr.message}`)
      }

      alert('Auction created successfully!')
      router.push(`/auctions/${auction.id}`)
    } catch (err: any) {
      console.error('Error creating auction:', err)
      setError(err.message || 'Failed to create auction')
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Auction</h1>
        <p className="text-gray-600">List your item for auction</p>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      <div className="bg-white border rounded-lg p-8 space-y-6">
        {/* Product Details */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Product Details</h2>
          <div className="space-y-4">
            <Input
              label="Product Name"
              placeholder="e.g., Vintage Rolex Watch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              isRequired
            />

            <div className="w-full space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Describe your item in detail...\n\n• Condition\n• Included accessories\n• Any defects or notes`}
                rows={8}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
              <FileUpload.Root>
                <FileUpload.DropZone
                  maxSize={10 * 1024 * 1024}
                  hint="Drag and drop images here (max 10MB each)"
                  onDropFiles={handleDropFiles}
                  onSizeLimitExceed={(files) => {
                    alert(`File too large. Max size: ${getReadableFileSize(10 * 1024 * 1024)}`)
                  }}
                />
                {uploadedFiles.length > 0 && (
                  <FileUpload.List>
                    {uploadedFiles.map((file) => (
                      <FileUpload.ListItemProgressBar
                        key={file.id}
                        {...file}
                        onDelete={() => handleDeleteFile(file.id)}
                        onRetry={() => {}}
                      />
                    ))}
                  </FileUpload.List>
                )}
              </FileUpload.Root>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Starting Price (GHS)"
              type="number"
              placeholder="0.00"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              isRequired
            />

            <Input
              label="Reserve Price (GHS)"
              type="number"
              placeholder="0.00 (optional)"
              value={reservePrice}
              onChange={(e) => setReservePrice(e.target.value)}
            />
          </div>
        </div>

        {/* Bidding Rules */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Bidding Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Minimum Bid Increment (GHS)"
              type="number"
              placeholder="1.00"
              value={minIncrement}
              onChange={(e) => setMinIncrement(e.target.value)}
            />

            <Input
              label="Maximum Bid Increment (GHS)"
              type="number"
              placeholder="Optional max increment"
              value={maxIncrement}
              onChange={(e) => setMaxIncrement(e.target.value)}
            />
          </div>
        </div>

        {/* Timing */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Auction Duration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              isRequired
            />

            <Input
              label="End Time"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              isRequired
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-6 border-t">
          <button
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={createAuction}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
          >
            {loading ? 'Creating Auction...' : 'Create Auction'}
          </button>
        </div>
      </div>
    </main>
  )
}