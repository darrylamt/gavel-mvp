'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type SellerShop = {
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  payout_account_name: string | null
  payout_account_number: string | null
  payout_provider: string | null
  status: string
}

export default function SellerShopPage() {
  const [shop, setShop] = useState<SellerShop | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [payoutProvider, setPayoutProvider] = useState('')
  const [payoutAccountName, setPayoutAccountName] = useState('')
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadShop = async () => {
    setLoading(true)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setError('Unauthorized')
      setLoading(false)
      return
    }

    const res = await fetch('/api/seller/shop', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load shop profile')
      setLoading(false)
      return
    }

    const nextShop = payload?.shop as SellerShop
    setShop(nextShop)
    setName(nextShop?.name || '')
    setDescription(nextShop?.description || '')
    setLogoUrl(nextShop?.logo_url || '')
    setCoverImageUrl(nextShop?.cover_image_url || '')
    setPayoutProvider(nextShop?.payout_provider || '')
    setPayoutAccountName(nextShop?.payout_account_name || '')
    setPayoutAccountNumber(nextShop?.payout_account_number || '')
    setLoading(false)
  }

  useEffect(() => {
    loadShop()
  }, [])

  const uploadImage = async (file: File, target: 'logo' | 'cover') => {
    if (target === 'logo') setUploadingLogo(true)
    if (target === 'cover') setUploadingCover(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData,
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'Image upload failed')
      }

      const uploadedUrl = String(payload?.url || '')
      if (!uploadedUrl) throw new Error('Upload did not return a URL')

      if (target === 'logo') {
        setLogoUrl(uploadedUrl)
      } else {
        setCoverImageUrl(uploadedUrl)
      }

      setSuccess(target === 'logo' ? 'Logo uploaded. Save to apply changes.' : 'Cover image uploaded. Save to apply changes.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      if (target === 'logo') setUploadingLogo(false)
      if (target === 'cover') setUploadingCover(false)
    }
  }

  const saveShop = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Unauthorized')

      const res = await fetch('/api/seller/shop', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          logo_url: logoUrl,
          cover_image_url: coverImageUrl,
          payout_provider: payoutProvider,
          payout_account_name: payoutAccountName,
          payout_account_number: payoutAccountNumber,
        }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Failed to update shop profile')

      const updated = payload?.shop as SellerShop
      setShop(updated)
      setSuccess('Shop profile updated successfully.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update shop profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="p-6">Loading shop profile…</p>
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Edit Shop</h1>
            <p className="mt-1 text-sm text-gray-600">Update your public shop details shown on the Shops page.</p>
            {shop?.slug && <p className="mt-1 text-xs text-gray-500">Shop URL key: {shop.slug}</p>}
          </div>
          <div className="flex items-center gap-2">
            {shop?.id && (
              <Link
                href={`/shop/seller/${shop.id}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                View Shop
              </Link>
            )}
            <Link
              href="/seller"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Company / Shop name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Enter your shop name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Logo</label>
            <div className="mb-2 flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo || saving}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void uploadImage(file, 'logo')
                    }
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              {logoUrl && <span className="text-xs text-gray-500">Logo uploaded</span>}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Cover image</label>
            <div className="mb-2 flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                {uploadingCover ? 'Uploading…' : 'Upload cover image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingCover || saving}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void uploadImage(file, 'cover')
                    }
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              {coverImageUrl && <span className="text-xs text-gray-500">Cover image uploaded</span>}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Tell buyers about your company/shop"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Payout Provider</label>
            <input
              value={payoutProvider}
              onChange={(event) => setPayoutProvider(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Bank / Mobile Money"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Payout Account Name</label>
            <input
              value={payoutAccountName}
              onChange={(event) => setPayoutAccountName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Account holder name"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Payout Account Number</label>
            <input
              value={payoutAccountNumber}
              onChange={(event) => setPayoutAccountNumber(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Account number"
            />
          </div>
        </div>

        <button
          onClick={saveShop}
          disabled={saving}
          className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Shop'}
        </button>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Preview</p>
          {coverImageUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
              <img src={coverImageUrl} alt={name || 'Shop cover'} className="h-32 w-full object-cover" />
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={name || 'Shop logo'} className="h-12 w-12 rounded-full border border-gray-200 object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-xs text-gray-500">No logo</div>
            )}
            <div>
              <p className="text-base font-semibold text-gray-900">{name || 'Shop name'}</p>
              {description && <p className="line-clamp-2 text-sm text-gray-600">{description}</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
