'use client'

import { useEffect, useMemo, useState } from 'react'
import SellerTermsAndConditions from '@/components/seller/SellerTermsAndConditions'
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
  const [showNewForm, setShowNewForm] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [nationalIdNumber, setNationalIdNumber] = useState('')
  const [ghanaCardFile, setGhanaCardFile] = useState<File | null>(null)
  const [backOfIdFile, setBackOfIdFile] = useState<File | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Post-submission phone opt-in
  const [notifyPhone, setNotifyPhone] = useState('')
  const [notifySent, setNotifySent] = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)

  const MAX_FILE_BYTES = 4 * 1024 * 1024

  const handleGhanaCardChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (file && file.size > MAX_FILE_BYTES) {
      setError('Ghana Card image is too large (max 4 MB). Please use a lower-resolution photo.')
      event.target.value = ''
      setGhanaCardFile(null)
      return
    }
    setError(null)
    setGhanaCardFile(file)
  }

  const handleBackOfIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (file && file.size > MAX_FILE_BYTES) {
      setError('Back of Ghana Card is too large (max 4 MB). Please use a lower-resolution photo.')
      event.target.value = ''
      setBackOfIdFile(null)
      return
    }
    setError(null)
    setBackOfIdFile(file)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
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

      const app = (payload?.application ?? null) as SellerApplication | null
      setExisting(app)
      if (app) setNotifyPhone(app.phone || '')
      setLoading(false)
    }

    load()
  }, [router])

  const canSubmit = useMemo(() => {
    return (
      !submitting &&
      businessName.trim() &&
      businessType.trim() &&
      phone.trim() &&
      address.trim() &&
      nationalIdNumber.trim() &&
      ghanaCardFile &&
      backOfIdFile &&
      acceptedTerms
    )
  }, [address, businessName, businessType, ghanaCardFile, nationalIdNumber, phone, backOfIdFile, submitting, acceptedTerms])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
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
      formData.append('selfie_with_card', backOfIdFile as File)

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

      const newApp = (payload?.application ?? null) as SellerApplication | null
      setExisting(newApp)
      if (newApp) setNotifyPhone(newApp.phone || '')
      setShowNewForm(false)
      setSuccess('Application submitted! Our team will review it within 2–5 business days.')
    } catch {
      setError('Network error while submitting application')
    } finally {
      setSubmitting(false)
    }
  }

  const sendNotifyOptIn = async () => {
    if (!notifyPhone.trim() || notifySent) return
    setNotifyLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      await fetch('/api/seller-applications/notify-phone', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: notifyPhone.trim(), business_name: existing?.business_name }),
      })
      setNotifySent(true)
    } catch {
      // fail silently
    } finally {
      setNotifyLoading(false)
    }
  }

  if (loading) {
    return <main className="mx-auto w-full max-w-3xl px-6 py-10"><p className="text-sm text-gray-600">Loading application form…</p></main>
  }

  const statusBadge = {
    pending: 'bg-amber-50 border-amber-200 text-amber-700',
    approved: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rejected: 'bg-red-50 border-red-200 text-red-700',
  }

  const showForm = showNewForm || !existing

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 space-y-5">
      <section className="rounded-2xl border bg-white p-5 shadow-sm md:p-6">
        <h1 className="text-2xl font-bold">Become a Seller</h1>
        <p className="mt-1 text-sm text-gray-600">Submit your business and identity details for seller verification.</p>
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <p><span className="font-semibold text-gray-800">Note:</span> Your <span className="font-semibold">Business name</span> is for seller verification and storefront records. It is separate from your profile display name.</p>
          <p className="mt-1"><span className="font-semibold text-gray-800">Why Ghana Card + Back:</span> We use these to confirm identity, prevent impersonation/fraud, and protect buyers and sellers on the marketplace.</p>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        {/* Existing application status */}
        {existing && !showForm && (
          <div className="mt-5 space-y-3">
            <div className={`rounded-xl border p-4 text-sm ${statusBadge[existing.status]}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold capitalize">{existing.status === 'pending' ? 'Under Review' : existing.status === 'approved' ? 'Approved' : 'Not Approved'}</p>
                  <p className="mt-0.5 text-xs opacity-80">{existing.business_name} · Submitted {new Date(existing.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${statusBadge[existing.status]}`}>{existing.status}</span>
              </div>
              {existing.rejection_reason && (
                <p className="mt-2 text-xs border-t border-current/20 pt-2 opacity-80"><span className="font-semibold">Reason:</span> {existing.rejection_reason}</p>
              )}
            </div>

            {/* Phone opt-in block for pending/approved */}
            {existing.status === 'pending' && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">Get notified when we review your application</p>
                <p className="mt-0.5 text-xs text-blue-600">We'll send an SMS update when your application is approved or rejected.</p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="tel"
                    value={notifyPhone}
                    onChange={(e) => setNotifyPhone(e.target.value)}
                    placeholder="e.g. 0241234567"
                    className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={notifySent}
                  />
                  <button
                    onClick={sendNotifyOptIn}
                    disabled={!notifyPhone.trim() || notifySent || notifyLoading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {notifySent ? 'Confirmed ✓' : notifyLoading ? '…' : 'Notify Me'}
                  </button>
                </div>
              </div>
            )}

            {/* Apply again buttons */}
            {(existing.status === 'approved' || existing.status === 'rejected') && (
              <button
                onClick={() => { setShowNewForm(true); setError(null); setSuccess(null) }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {existing.status === 'approved' ? '+ Apply for Another Shop' : 'Reapply'}
              </button>
            )}
          </div>
        )}

        {/* Application form */}
        {showForm && (
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            {showNewForm && (
              <div className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                <p className="text-xs font-medium text-orange-700">New application — previous records are kept.</p>
                <button type="button" onClick={() => setShowNewForm(false)} className="text-xs text-orange-500 hover:text-orange-700 font-semibold">Cancel</button>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Business name</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Business type</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required>
                <option value="" disabled>Select business type</option>
                <option value="Registered">Registered</option>
                <option value="Unregistered">Unregistered</option>
                <option value="Not sure">Not sure yet</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Choose what best describes your business right now.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ghana Card number</label>
              <input value={nationalIdNumber} onChange={(e) => setNationalIdNumber(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Upload Ghana Card image</label>
              <input type="file" accept="image/*,application/pdf" onChange={handleGhanaCardChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
              <p className="mt-1 text-xs text-gray-500">Max 4 MB. Needed to verify your legal identity for seller approval.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Upload back of Ghana Card</label>
              <input type="file" accept="image/*" onChange={handleBackOfIdChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
              <p className="mt-1 text-xs text-gray-500">Max 4 MB. Needed to verify your identity and reduce fraud.</p>
            </div>
            <div>
              <SellerTermsAndConditions onAccept={() => setAcceptedTerms(true)} />
              {!acceptedTerms && (
                <p className="mt-2 text-xs text-red-600">You must accept the Seller Terms & Conditions to apply.</p>
              )}
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
