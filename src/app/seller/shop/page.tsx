'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase, getSessionHeaders } from '@/lib/supabaseClient'
import SellerDeliveryZones from '@/components/seller/SellerDeliveryZonesNew'
import { Store, Upload, ExternalLink, CheckCircle2, AlertCircle, ArrowLeft, Image } from 'lucide-react'

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

const inputCls = 'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all'
const labelCls = 'mb-1.5 block text-sm font-semibold text-gray-700'

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
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setError('Unauthorized'); setLoading(false); return }
    const res = await fetch('/api/seller/shop', { headers: { Authorization: `Bearer ${token}` } })
    const payload = await res.json().catch(() => null)
    if (!res.ok) { setError(payload?.error || 'Failed to load shop profile'); setLoading(false); return }
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

  useEffect(() => { loadShop() }, [])

  const uploadImage = async (file: File, target: 'logo' | 'cover') => {
    if (target === 'logo') setUploadingLogo(true)
    if (target === 'cover') setUploadingCover(true)
    setError(null)
    setSuccess(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const headers = await getSessionHeaders()
      const res = await fetch('/api/upload/product-image', { method: 'POST', headers, body: formData })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Image upload failed')
      const uploadedUrl = String(payload?.url || '')
      if (!uploadedUrl) throw new Error('Upload did not return a URL')
      if (target === 'logo') setLogoUrl(uploadedUrl)
      else setCoverImageUrl(uploadedUrl)
      setSuccess(target === 'logo' ? 'Logo uploaded. Save to apply.' : 'Cover uploaded. Save to apply.')
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
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Unauthorized')
      const res = await fetch('/api/seller/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description, logo_url: logoUrl, cover_image_url: coverImageUrl, payout_provider: payoutProvider, payout_account_name: payoutAccountName, payout_account_number: payoutAccountNumber }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Failed to update shop profile')
      setShop(payload?.shop as SellerShop)
      setSuccess('Shop profile updated successfully.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update shop profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
            <Store className="h-4.5 w-4.5 text-gray-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Shop</h1>
            {shop?.slug && <p className="text-xs text-gray-400">Key: {shop.slug}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {shop?.id && (
            <Link href={`/shop/seller/${shop.id}`} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> View Shop
            </Link>
          )}
          <Link href="/seller" className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* Cover + Logo preview */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Cover image */}
        <div className="relative h-36 sm:h-44 bg-gray-100">
          {coverImageUrl ? (
            <img src={coverImageUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Image className="h-8 w-8 text-gray-300" />
            </div>
          )}
          <label className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-1.5 rounded-xl bg-black/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black transition-colors">
            {uploadingCover ? (
              <><span className="h-3 w-3 border border-white/40 border-t-white rounded-full animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-3 w-3" /> Cover</>
            )}
            <input type="file" accept="image/*" className="hidden" disabled={uploadingCover || saving} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f, 'cover'); e.currentTarget.value = '' }} />
          </label>
        </div>

        {/* Logo + shop name preview */}
        <div className="flex items-center gap-3 px-4 py-4 -mt-6">
          <div className="relative flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-full border-2 border-white shadow-md object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white shadow-md bg-orange-100">
                <Store className="h-6 w-6 text-orange-500" />
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-gray-900 border-2 border-white hover:bg-black transition-colors">
              {uploadingLogo ? (
                <span className="h-2.5 w-2.5 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload className="h-3 w-3 text-white" />
              )}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo || saving} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f, 'logo'); e.currentTarget.value = '' }} />
            </label>
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">{name || 'Shop name'}</p>
            {description && <p className="text-xs text-gray-500 line-clamp-1">{description}</p>}
          </div>
        </div>
      </div>

      {/* Shop details form */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Shop Details</h2>

        <div>
          <label className={labelCls}>Shop Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Your shop name" />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="Tell buyers about your shop…" />
        </div>
      </div>

      {/* Payout info */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Payout Details</h2>
          <p className="text-xs text-gray-400 mt-0.5">Where your earnings will be sent after confirmed deliveries.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Payout Provider</label>
            <input value={payoutProvider} onChange={(e) => setPayoutProvider(e.target.value)} className={inputCls} placeholder="e.g. MTN Mobile Money" />
          </div>
          <div>
            <label className={labelCls}>Account Name</label>
            <input value={payoutAccountName} onChange={(e) => setPayoutAccountName(e.target.value)} className={inputCls} placeholder="Account holder name" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Account Number</label>
            <input value={payoutAccountNumber} onChange={(e) => setPayoutAccountNumber(e.target.value)} className={inputCls} placeholder="Account number" />
          </div>
        </div>
      </div>

      {/* Save button */}
      <button onClick={saveShop} disabled={saving} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-60 transition-colors">
        {saving ? (
          <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
        ) : 'Save Shop'}
      </button>

      {/* Delivery Zones */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Delivery Zones & Pricing</h2>
        <SellerDeliveryZones />
      </div>
    </div>
  )
}
