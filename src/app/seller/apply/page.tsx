'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/base/input/input'

type SellerApplication = {
  id: string
  business_name: string
  business_type: string
  phone: string
  address: string
  national_id_number: string
  selfie_with_card_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  rejection_reason: string | null
}

export default function SellerApplyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [application, setApplication] = useState<SellerApplication | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [nationalIdNumber, setNationalIdNumber] = useState('')
  const [idDocument, setIdDocument] = useState<File | null>(null)
  const [selfieWithCard, setSelfieWithCard] = useState<File | null>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user
      const token = session?.access_token

      if (!user || !token) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, phone, address')
        .eq('id', user.id)
        .single()

      const role = profile?.role ?? 'user'
      setUserRole(role)
      setPhone(profile?.phone ?? '')
      setAddress(profile?.address ?? '')

      if (role === 'seller') {
        setLoading(false)
        return
      }

      const res = await fetch('/api/seller-applications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const payload = await res.json()
        setApplication(payload.application ?? null)
      }

      setLoading(false)
    }

    load()
  }, [router])

  const submitApplication = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Please sign in to continue')

      if (!businessName.trim()) throw new Error('Business name is required')
      if (!businessType.trim()) throw new Error('Business type is required')
      if (!phone.trim()) throw new Error('Phone is required')
      if (!address.trim()) throw new Error('Address is required')
      if (!nationalIdNumber.trim()) throw new Error('Ghana Card number is required')
      if (!idDocument) throw new Error('Ghana Card document is required')
      if (!selfieWithCard) throw new Error('Please upload a photo of you holding your Ghana Card')

      const formData = new FormData()
      formData.append('business_name', businessName.trim())
      formData.append('business_type', businessType.trim())
      formData.append('phone', phone.trim())
      formData.append('address', address.trim())
      formData.append('national_id_number', nationalIdNumber.trim())
      formData.append('id_document', idDocument)
      formData.append('selfie_with_card', selfieWithCard)

      const res = await fetch('/api/seller-applications', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to submit application')
      }

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          phone: phone.trim(),
          address: address.trim(),
        })
        .eq('id', session?.user.id)

      if (profileUpdateError) {
        console.error('Profile update warning:', profileUpdateError)
      }

      setApplication(payload.application)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit application'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="p-6">Loading seller application…</p>
  }

  if (userRole === 'seller') {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">You are already an approved seller</h1>
          <p className="mt-2 text-sm text-gray-600">Go to your seller dashboard to create and manage auctions.</p>
          <button
            onClick={() => router.push('/seller')}
            className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Open Seller Dashboard
          </button>
        </div>
      </main>
    )
  }

  if (application?.status === 'pending') {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Application under review</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your seller application was submitted on {new Date(application.created_at).toLocaleString()} and is currently pending.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Become a Seller</h1>
        <p className="text-sm text-gray-600">Submit your business details for review before you can create auctions.</p>
      </header>

      {application?.status === 'rejected' && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Your last application was rejected.</p>
          {application.rejection_reason && <p className="mt-1">Reason: {application.rejection_reason}</p>}
          {application.reviewed_at && <p className="mt-1">Reviewed on: {new Date(application.reviewed_at).toLocaleString()}</p>}
          <p className="mt-2">You can submit a new application below.</p>
        </section>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <Input
          label="Business Name"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Your business or store name"
          isRequired
        />

        <Input
          label="Business Type"
          value={businessType}
          onChange={(event) => setBusinessType(event.target.value)}
          placeholder="e.g. Electronics, Vehicles, Fashion"
          isRequired
        />

        <Input
          label="Phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="e.g. 0240000000"
          isRequired
        />

        <Input
          label="Address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Business address"
          isRequired
        />

        <Input
          label="Ghana Card Number"
          value={nationalIdNumber}
          onChange={(event) => setNationalIdNumber(event.target.value)}
          placeholder="GHA-XXXXXXXX-X"
          isRequired
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Ghana Card Document
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) => setIdDocument(event.target.files?.[0] ?? null)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500">Upload a clear image or PDF of your Ghana Card. Max size: 10MB.</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Photo Holding Ghana Card
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={(event) => setSelfieWithCard(event.target.files?.[0] ?? null)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500">
            Take a photo showing your full face and your Ghana Card clearly visible.
          </p>
        </div>

        <button
          onClick={submitApplication}
          disabled={submitting}
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Seller Application'}
        </button>
      </section>
    </main>
  )
}
