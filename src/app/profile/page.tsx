'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

import ProfileHeader from '@/components/profile/ProfileHeader'
import ContactDetailsSection from '@/components/profile/ContactDetailsSection'
import WonAuctionsSection from '@/components/profile/WonAuctionsSection'
import SignOutButton from '@/components/profile/SignOutButton'
import EditProfileModal from '@/components/profile/EditProfileModal'
import BidAuctionsSection from '@/components/profile/BidAuctionsSection'

type WonAuction = {
  auction_id: string
  title: string
  amount: number
  paid: boolean
}

type ProfileData = {
  username: string | null
  token_balance: number | null
  phone: string | null
  address: string | null
  avatar_url: string | null
}

type BidAuctionItem = {
  auctionId: string
  title: string
  yourHighestBid: number
  currentPrice: number
  status: string
}

type UserBidRow = {
  auction_id: string
  amount: number
  auctions:
    | {
        id: string
        title: string
        current_price: number
        status: string | null
      }
    | {
        id: string
        title: string
        current_price: number
        status: string | null
      }[]
    | null
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [tokens, setTokens] = useState<number>(0)

  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([])
  const [bidAuctions, setBidAuctions] = useState<BidAuctionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const loadWonAuctions = async (uid: string) => {
    const { data } = await supabase.rpc(
      'get_auctions_won_by_user',
      { uid }
    )

    setWonAuctions(data || [])
  }

  const loadBidAuctions = async (uid: string) => {
    const { data } = await supabase
      .from('bids')
      .select('auction_id, amount, auctions(id, title, current_price, status)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    const rows = (data as UserBidRow[] | null) ?? []
    const byAuction = new Map<string, BidAuctionItem>()

    for (const row of rows) {
      const auction = Array.isArray(row.auctions) ? row.auctions[0] : row.auctions
      if (!auction?.id) continue

      const existing = byAuction.get(auction.id)
      const amount = Number(row.amount)

      if (!existing) {
        byAuction.set(auction.id, {
          auctionId: auction.id,
          title: auction.title,
          yourHighestBid: amount,
          currentPrice: Number(auction.current_price ?? 0),
          status: auction.status ?? 'unknown',
        })
      } else if (amount > existing.yourHighestBid) {
        existing.yourHighestBid = amount
      }
    }

    setBidAuctions(Array.from(byAuction.values()))
  }

  useEffect(() => {
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const activeUser = sessionData.session?.user

      let authUser = activeUser

      if (!authUser) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        authUser = refreshed.session?.user
      }

      if (!authUser) {
        setLoading(false)
        return
      }

      setUserId(authUser.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, token_balance, phone, address, avatar_url')
        .eq('id', authUser.id)
        .single()

      const profileData = (profile as ProfileData | null) ?? null

      const metadataFullName =
        (typeof authUser.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name.trim()) ||
        [authUser.user_metadata?.first_name, authUser.user_metadata?.last_name]
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .join(' ')
          .trim()

      setUsername(profileData?.username ?? (metadataFullName || null))
      setTokens(profileData?.token_balance ?? 0)
      setPhone(profileData?.phone ?? '')
      setAddress(profileData?.address ?? '')
      setAvatarUrl(profileData?.avatar_url ?? null)

      await loadWonAuctions(authUser.id)
      await loadBidAuctions(authUser.id)

      setLoading(false)
    }

    loadProfile()
  }, [])

  const payNow = async (auctionId: string) => {
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
      />

      <WonAuctionsSection
        auctions={wonAuctions}
        onPay={payNow}
      />

      <BidAuctionsSection auctions={bidAuctions} />

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
