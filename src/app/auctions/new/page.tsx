'use client'

import { useEffect, useState } from 'react'
import { supabase, getSessionHeaders } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/base/input/input'
import { FileUpload, getReadableFileSize } from '@/components/base/file-upload/file-upload'
import { type SaleSource } from '@/lib/auctionMeta'
import { buildAuctionPath } from '@/lib/seo'
import { generateAccessCode } from '@/lib/privateAuctionUtils'
import Toggle from '@/components/ui/toggle'
import { Copy, RefreshCw } from 'lucide-react'

type UploadedFileItem = {
  id: string
  name: string
  size: number
  type: string
  progress: number
  fileObject: File
}

export default function NewAuction() {
  const router = useRouter()

  const [accessLoading, setAccessLoading] = useState(true)
  const [isSeller, setIsSeller] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  
  /* Form state */
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saleSource, setSaleSource] = useState<SaleSource>('gavel')
  const [sellerDisplayName, setSellerDisplayName] = useState('')
  const [sellerContactPhone, setSellerContactPhone] = useState('')
  const [sellerNetAmount, setSellerNetAmount] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [minIncrement, setMinIncrement] = useState('')
  const [maxIncrement, setMaxIncrement] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [anonymousBiddingEnabled, setAnonymousBiddingEnabled] = useState(true)
  const [accessCode, setAccessCode] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [aiDescriptionLoading, setAiDescriptionLoading] = useState(false)
  const [aiDescriptionError, setAiDescriptionError] = useState<string | null>(null)
  const [descriptionGeneratedByAi, setDescriptionGeneratedByAi] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, username, phone')
        .eq('id', user.id)
        .single()

      const { data: approvedApplication } = await supabase
        .from('seller_applications')
        .select('business_name, phone')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const role = profile?.role ?? 'user'
      setIsSeller(role === 'seller' || role === 'admin')
      setIsAdmin(role === 'admin')
      setSellerDisplayName(approvedApplication?.business_name ?? profile?.username ?? user.email ?? '')
      setSellerContactPhone(approvedApplication?.phone ?? profile?.phone ?? '')
      if (role !== 'admin') {
        setSaleSource('seller')
      }
      setAccessLoading(false)
    }

    checkAccess()
  }, [router])

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

  const generateDescriptionWithAi = async () => {
    setAiDescriptionLoading(true)
    setAiDescriptionError(null)

    try {
      if (uploadedFiles.length === 0) {
        throw new Error('Please upload an image first')
      }

      const firstFile = uploadedFiles[0]!.fileObject
      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          const base64 = (event.target?.result as string).split(',')[1]
          if (!base64) throw new Error('Failed to convert image to base64')

          const mediaType = firstFile.type || 'image/jpeg'

          const res = await fetch('/api/ai/describe-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, mediaType, productName: title.trim() }),
          })

          if (!res.ok) {
            const errData = await res.json()
            throw new Error(errData.error || 'Failed to generate description')
          }

          const data = (await res.json()) as { description?: string }
          if (data.description) {
            setDescription(data.description)
            setDescriptionGeneratedByAi(true)
            setAiDescriptionLoading(false)
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          setAiDescriptionError(message)
          setAiDescriptionLoading(false)
        }
      }

      reader.onerror = () => {
        setAiDescriptionError('Failed to read image file')
        setAiDescriptionLoading(false)
      }

      reader.readAsDataURL(firstFile)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate description'
      setAiDescriptionError(message)
      setAiDescriptionLoading(false)
    }
  }

  const createAuction = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!isSeller) throw new Error('Only approved sellers can create auctions')

      /* Validate form */
      if (!title.trim()) throw new Error('Product name is required')
      if (!description.trim()) throw new Error('Description is required')
      if (!startingPrice) throw new Error('Starting price is required')
      if (!startsAt) throw new Error('Start time is required')
      if (!endsAt) throw new Error('End time is required')

      if (saleSource === 'seller') {
        if (!sellerDisplayName.trim()) throw new Error('Seller profile details are missing. Please update your profile/application.')
        if (!sellerContactPhone.trim()) throw new Error('Seller phone is missing. Please update your profile/application.')
        if (!sellerNetAmount) throw new Error('Least expected amount is required')
      }

      const sellerAmountValue = saleSource === 'seller' ? Number(sellerNetAmount) : null
      if (saleSource === 'seller' && (!sellerAmountValue || sellerAmountValue <= 0)) {
        throw new Error('Least expected amount must be greater than 0')
      }

      const startTime = new Date(startsAt).getTime()
      const endTime = new Date(endsAt).getTime()
      const now = Date.now()

      if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
        throw new Error('Start and end time are invalid')
      }
      if (startTime < now) throw new Error('Start time must be in the future')
      if (endTime <= startTime) throw new Error('End time must be after start time')

      /* Get auth user */
      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user) throw new Error('Not logged in')

      const computedReserve =
        saleSource === 'seller'
          ? Math.ceil((sellerAmountValue as number) * 1.1)
          : reservePrice
          ? Number(reservePrice)
          : null

      /* Create auction */
      const payload = {
        title: title.trim(),
        description: description.trim(),
        starting_price: Number(startingPrice),
        current_price: Number(startingPrice),
        reserve_price: computedReserve,
        sale_source: saleSource,
        seller_name: saleSource === 'seller' ? sellerDisplayName.trim() : null,
        seller_phone: saleSource === 'seller' ? sellerContactPhone.trim() : null,
        seller_expected_amount: saleSource === 'seller' ? (sellerAmountValue as number) : null,
        min_increment: minIncrement ? Number(minIncrement) : 1,
        max_increment: maxIncrement ? Number(maxIncrement) : null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        seller_id: authData.user.id,
        status: startTime > now ? 'scheduled' : 'active',
        is_private: isPrivate,
        access_code: isPrivate ? accessCode : null,
        anonymous_bidding_enabled: isPrivate ? anonymousBiddingEnabled : true,
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

        const headers = await getSessionHeaders()
        const res = await fetch('/api/upload/auction-image', {
          method: 'POST',
          headers,
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
        const { data: updatedAuction, error: updateErr } = await supabase
          .from('auctions')
          .update({ image_url: uploadedUrls[0], images: uploadedUrls })
          .eq('id', auction.id)
          .select('id')
          .maybeSingle()

        if (updateErr) throw new Error(`Update failed: ${updateErr.message}`)
        if (!updatedAuction?.id) {
          throw new Error('Image links could not be saved to this auction. Please contact support.')
        }
      }

      /* Generate embedding for semantic search */
      try {
        const embeddingResponse = await fetch('/api/embeddings/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: auction.id,
            type: 'auction',
            title: title.trim(),
            description: description.trim(),
            category: null,
          }),
        })

        if (!embeddingResponse.ok) {
          const responseBody = await embeddingResponse.text()
          console.warn('Embedding API returned non-OK status for auction create', {
            auctionId: auction.id,
            status: embeddingResponse.status,
            body: responseBody,
          })
        }
      } catch (embErr) {
        console.warn('Failed to generate embedding during auction create', {
          auctionId: auction.id,
          error: embErr,
        })
        // Don't fail the whole operation if embedding fails
      }

      alert('Auction created successfully!')
      router.push(buildAuctionPath(auction.id, auction.title ?? title))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create auction'
      console.error('Error creating auction:', err)
      setError(message)
      alert(`Error: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  if (accessLoading) {
    return <p className="p-6">Checking seller access…</p>
  }

  if (!isSeller) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Seller approval required</h1>
          <p className="mt-2 text-sm text-gray-600">Only approved sellers can create auctions.</p>
          <button
            onClick={() => router.push('/contact')}
            className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Contact Support
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Auction</h1>
        <p className="text-gray-600">List your item for auction</p>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      <div className="bg-white border rounded-lg p-8 space-y-6">
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">{isAdmin ? 'Sale Source' : 'Seller Details'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isAdmin ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Who owns this item?</label>
                <select
                  value={saleSource}
                  onChange={(e) => setSaleSource(e.target.value as SaleSource)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="gavel">Gavel Products</option>
                  <option value="seller">External Seller</option>
                </select>
              </div>
            ) : null}

            {saleSource === 'seller' && (
              <Input
                label="Least Expected Amount (GHS)"
                type="number"
                placeholder="0.00"
                value={sellerNetAmount}
                onChange={(e) => setSellerNetAmount(e.target.value)}
                isRequired
                hint={`Reserve auto-calculated: GHS ${Math.ceil((Number(sellerNetAmount || 0) * 1.1) || 0).toLocaleString()}`}
                tooltip="Gavel adds 10% on top of the least expected amount and uses that as reserve price."
              />
            )}
          </div>
        </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
              <p className="text-sm text-gray-500 mb-3">Upload at least one image. The AI will use the first image to generate a description.</p>
              <FileUpload.Root>
                <FileUpload.DropZone
                  maxSize={10 * 1024 * 1024}
                  hint="Drag and drop images here (max 10MB each)"
                  onDropFiles={handleDropFiles}
                  onSizeLimitExceed={() => {
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

            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateDescriptionWithAi}
                  disabled={aiDescriptionLoading || uploadedFiles.length === 0}
                  className="text-sm px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {aiDescriptionLoading ? 'Generating...' : description.trim() ? '✨ Improve with AI' : '✨ Generate with AI'}
                </button>
              </div>
              {aiDescriptionError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">Couldn't generate description. Please write one manually.</div>
              )}
              {descriptionGeneratedByAi && !aiDescriptionError && (
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">AI-generated — please review before publishing</div>
              )}
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setDescriptionGeneratedByAi(false)
                }}
                placeholder={`Describe your item in detail...\n\n• Condition\n• Included accessories\n• Any defects or notes`}
                rows={8}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              />
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
              label={saleSource === 'seller' ? 'Reserve Price (Auto)' : 'Reserve Price (GHS)'}
              type="number"
              placeholder={saleSource === 'seller' ? 'Auto-calculated from seller amount + 10%' : '0.00 (optional)'}
              value={saleSource === 'seller' ? Math.ceil((Number(sellerNetAmount || 0) * 1.1) || 0).toString() : reservePrice}
              onChange={(e) => setReservePrice(e.target.value)}
              tooltip={saleSource === 'seller'
                ? "Auto-calculated as Least Expected Amount + 10% Gavel fee."
                : "Minimum final bid required to sell this item. If bidding ends below this amount, the item is not sold and winner payment is disabled."}
              hint={saleSource === 'seller' ? 'Derived from seller amount and locked.' : 'Optional: set a minimum sale threshold.'}
              disabled={saleSource === 'seller'}
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
              tooltip="Smallest amount each new bid must add above the current highest bid."
            />

            <Input
              label="Maximum Bid Increment (GHS)"
              type="number"
              placeholder="Optional max increment"
              value={maxIncrement}
              onChange={(e) => setMaxIncrement(e.target.value)}
              tooltip="Optional cap on how much higher a single bid can be than the current highest bid."
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
              tooltip="When bidding opens. Users can star before start; bidding starts at this time."
            />

            <Input
              label="End Time"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              isRequired
              tooltip="When bidding should end. Last-second bids within 30 seconds extend the timer by 30 seconds."
            />
          </div>
        </div>

        {/* Private Auction Settings */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">Make this a Private Auction</p>
              <p className="text-sm text-gray-600">Only users with the access code can view and bid.</p>
            </div>
            <Toggle
              checked={isPrivate}
              onChange={(checked) => {
                setIsPrivate(checked)
                if (checked && !accessCode) {
                  setAccessCode(generateAccessCode())
                }
              }}
              label=""
            />
          </div>

          {isPrivate && (
            <div className="ml-7 space-y-4 border-l-2 border-gray-200 pl-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Anonymous bidding</p>
                  <p className="text-xs text-gray-600">Turn off to show bidder usernames in this private auction.</p>
                </div>
                <Toggle
                  checked={anonymousBiddingEnabled}
                  onChange={setAnonymousBiddingEnabled}
                  label=""
                />
              </div>

              <p className="text-sm text-gray-600">
                Users will need an access code to view and bid on this auction.
              </p>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Access Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accessCode}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono tracking-wider text-center"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAccessCode(generateAccessCode())
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    title="Generate new code"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(accessCode)
                      setCodeCopied(true)
                      setTimeout(() => setCodeCopied(false), 2000)
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    title="Copy to clipboard"
                  >
                    <Copy size={18} />
                    {codeCopied && <span className="text-xs">Copied!</span>}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Share this code with authorized bidders only. Users will need to enter it to access the auction.
                </p>
              </div>
            </div>
          )}
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