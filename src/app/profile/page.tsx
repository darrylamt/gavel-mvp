'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

import ProfileHeader from '@/components/profile/ProfileHeader'
import ContactDetailsSection from '@/components/profile/ContactDetailsSection'
import WonAuctionsSection from '@/components/profile/WonAuctionsSection'
import SignOutButton from '@/components/profile/SignOutButton'
import EditProfileModal from '@/components/profile/EditProfileModal'

type WonAuction = {
  auction_id: string
  title: string
  amount: number
  paid: boolean
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [tokens, setTokens] = useState<number>(0)

  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setLoading(false)
        return
      }

      setUserId(auth.user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, token_balance, phone, address')
        .eq('id', auth.user.id)
        .single()

      setUsername(profile?.username ?? null)
      setTokens(profile?.token_balance ?? 0)
      setPhone(profile?.phone ?? '')
      setAddress(profile?.address ?? '')
      setAvatarUrl((profile as any)?.avatar_url ?? null)

      await loadWonAuctions(auth.user.id)

      setLoading(false)
    }

    loadProfile()
  }, [])

  const loadWonAuctions = async (uid: string) => {
    const { data } = await supabase.rpc(
      'get_auctions_won_by_user',
      { uid }
    )

    setWonAuctions(data || [])
  }

  const saveContactDetails = async () => {
    if (!userId) return

    setSaving(true)

    await supabase
      .from('profiles')
      .update({
        phone,
        address,
      })
      .eq('id', userId)

    setSaving(false)
    alert('Profile updated successfully')
  }

  const payNow = async (auctionId: string, amount: number) => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user || !auth.user.email) return

    const res = await fetch('/api/auction-payments/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: auctionId,
        user_id: auth.user.id,
        email: auth.user.email,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || 'Payment failed')
      return
    }

    window.location.href = data.authorization_url
  }

  if (loading) return <p className="p-6">Loading profile…</p>

  if (!userId) {
    return (
      <p className="p-6 text-sm text-gray-600">
        Please sign in to view your profile.
      </p>
    )
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-10">
      <ProfileHeader
        username={username}
        tokens={tokens}
        avatarUrl={avatarUrl}
        onEdit={() => setEditOpen(true)}
      />

      <ContactDetailsSection
        phone={phone}
        address={address}
        onPhoneChange={setPhone}
        onAddressChange={setAddress}
        onSave={saveContactDetails}
        saving={saving}
      />

      <WonAuctionsSection
        auctions={wonAuctions}
        onPay={payNow}
      />

      <SignOutButton />

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        userId={userId!}
        initialUsername={username}
        initialPhone={phone}
        initialAddress={address}
        initialAvatarUrl={avatarUrl}
        onSaved={(d) => {
          if (d.username) setUsername(d.username)
          if (typeof d.phone !== 'undefined') setPhone(d.phone)
          if (typeof d.address !== 'undefined') setAddress(d.address)
          if (d.avatarUrl) setAvatarUrl(d.avatarUrl)
        }}
      />
    </main>
  )
}
