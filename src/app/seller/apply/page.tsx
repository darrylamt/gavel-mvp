'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type ApplicationStatus = 'pending' | 'approved' | 'rejected'

type SellerApplication = {
  id: string
  business_name: string
  business_type: string
  phone: string
  address: string
  national_id_number: string
  status: ApplicationStatus
  created_at: string
  reviewed_at: string | null
  rejection_reason: string | null
}

export default function SellerApplyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [existing, setExisting] = useState<SellerApplication | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [nationalIdNumber, setNationalIdNumber] = useState('')
  const [ghanaCardFile, setGhanaCardFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/seller-applications', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.error || 'Failed to load seller application state')
        setLoading(false)
        return
      }

      setExisting((payload?.application ?? null) as SellerApplication | null)
      setLoading(false)
    }

    load()
  }, [router])

  const canSubmit = useMemo(() => {
    return (
      !submitting &&
      !existing &&
      businessName.trim() &&
      businessType.trim() &&
      phone.trim() &&
      address.trim() &&
      nationalIdNumber.trim() &&
      ghanaCardFile &&
      selfieFile
    )
  }, [
    address,
    businessName,
    businessType,
    existing,
    ghanaCardFile,
    nationalIdNumber,
    phone,
    selfieFile,
    submitting,
  ])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        setError('Unauthorized')
        setSubmitting(false)
        return
      }

      const formData = new FormData()
      formData.append('business_name', businessName.trim())
      formData.append('business_type', businessType.trim())
      formData.append('phone', phone.trim())
      formData.append('address', address.trim())
      formData.append('national_id_number', nationalIdNumber.trim())
      formData.append('id_document', ghanaCardFile as File)
      formData.append('selfie_with_card', selfieFile as File)

      const res = await fetch('/api/seller-applications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.error || 'Failed to submit seller application')
        setSubmitting(false)
        return
      }

      setExisting((payload?.application ?? null) as SellerApplication | null)
      setSuccess('Application submitted. Our team will review it shortly.')
    } catch {
      setError('Network error while submitting application')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <main className="mx-auto w-full max-w-3xl px-6 py-10"><p className="text-sm text-gray-600">Loading application form…</p></main>
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <section className="rounded-2xl border bg-white p-5 shadow-sm md:p-6">
        <h1 className="text-2xl font-bold">Become a Seller</h1>
        <p className="mt-1 text-sm text-gray-600">Submit your business and identity details for seller verification.</p>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        {existing ? (
          <div className="mt-5 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <p>
              <span className="font-semibold">Status:</span>{' '}
              <span className="capitalize">{existing.status}</span>
            </p>
            <p><span className="font-semibold">Business:</span> {existing.business_name}</p>
            <p><span className="font-semibold">Submitted:</span> {new Date(existing.created_at).toLocaleString()}</p>
            {existing.rejection_reason && (
              <p><span className="font-semibold">Reason:</span> {existing.rejection_reason}</p>
            )}
          </div>
        ) : (
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Business name</label>
              <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Business type</label>
              <input value={businessType} onChange={(event) => setBusinessType(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
              <input value={address} onChange={(event) => setAddress(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ghana Card number</label>
              <input value={nationalIdNumber} onChange={(event) => setNationalIdNumber(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Upload Ghana Card image</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => setGhanaCardFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Upload selfie holding Ghana Card</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setSelfieFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
