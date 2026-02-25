'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'


import ProfileHeader from '@/components/profile/ProfileHeader'
import ContactDetailsSection from '@/components/profile/ContactDetailsSection'
import WonAuctionsSection from '@/components/profile/WonAuctionsSection'
import SignOutButton from '@/components/profile/SignOutButton'
import EditProfileModal from '@/components/profile/EditProfileModal'
import BidAuctionsSection from '@/components/profile/BidAuctionsSection'

// Add settings link

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
  whatsapp_phone: string | null
  whatsapp_opt_in: boolean | null
  whatsapp_marketing_opt_in: boolean | null
  address: string | null
  avatar_url: string | null
  role: string | null
}

type BidAuctionItem = {
  auctionId: string
  title: string
  yourHighestBid: number
  currentPrice: number
  status: string
}

// ...existing code...

// Add settings link to profile UI (top right for now)
// Find the main return and add a link to /profile/settings

// ...existing code...

// In the main profile page component, add:

// ...existing code...

// Example insertion (adjust placement as needed):

// <div className="flex justify-end mb-4">
//   <Link href="/profile/settings" className="text-sm text-blue-600 hover:underline">Settings</Link>
// </div>

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [tokens, setTokens] = useState<number>(0)

  const [phone, setPhone] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [whatsappMarketingOptIn, setWhatsappMarketingOptIn] = useState(false)
  const [address, setAddress] = useState('')

  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([])
  const [bidAuctions, setBidAuctions] = useState<BidAuctionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [onboardingHandled, setOnboardingHandled] = useState(false)
  const [canAccessSellerDashboard, setCanAccessSellerDashboard] = useState(false)

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
        .select('username, token_balance, phone, whatsapp_phone, whatsapp_opt_in, whatsapp_marketing_opt_in, address, avatar_url, role')
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
      setWhatsappPhone(profileData?.whatsapp_phone ?? '')
      setWhatsappOptIn(Boolean(profileData?.whatsapp_opt_in))
      setWhatsappMarketingOptIn(Boolean(profileData?.whatsapp_marketing_opt_in))
      setAddress(profileData?.address ?? '')
      setAvatarUrl(profileData?.avatar_url ?? null)

      const isSellerRole = profileData?.role === 'seller'
      if (isSellerRole) {
        setCanAccessSellerDashboard(true)
      } else {
        const { data: activeShop } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', authUser.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        setCanAccessSellerDashboard(!!activeShop)
      }

      await loadWonAuctions(authUser.id)
      await loadBidAuctions(authUser.id)

      setLoading(false)
    }

    loadProfile()
  }, [])

  useEffect(() => {
    const onboarding = searchParams.get('onboarding')
    if (loading || onboardingHandled || onboarding !== '1') {
      return
    }

    setEditOpen(true)
    setOnboardingHandled(true)
    router.replace('/profile')
  }, [loading, onboardingHandled, router, searchParams])

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

      {canAccessSellerDashboard && (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Seller access available</p>
              <p className="text-sm text-gray-600">Manage your auctions, products, earnings, and deliveries.</p>
            </div>
            <Link
              href="/seller"
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Seller Dashboard
            </Link>
          </div>
        </section>
      )}

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
        initialWhatsAppPhone={whatsappPhone}
        initialWhatsAppOptIn={whatsappOptIn}
        initialWhatsAppMarketingOptIn={whatsappMarketingOptIn}
        initialAddress={address}
        initialAvatarUrl={avatarUrl}
        onSaved={(d: {
          username?: string;
          phone?: string;
          whatsappPhone?: string;
          whatsappOptIn?: boolean;
          whatsappMarketingOptIn?: boolean;
          address?: string;
          avatarUrl?: string;
        }) => {
          if (d.username) setUsername(d.username)
          if (typeof d.phone !== 'undefined') setPhone(d.phone)
          if (typeof d.whatsappPhone !== 'undefined') setWhatsappPhone(d.whatsappPhone)
          if (typeof d.whatsappOptIn !== 'undefined') setWhatsappOptIn(d.whatsappOptIn)
          if (typeof d.whatsappMarketingOptIn !== 'undefined') setWhatsappMarketingOptIn(d.whatsappMarketingOptIn)
          if (typeof d.address !== 'undefined') setAddress(d.address)
          if (d.avatarUrl) setAvatarUrl(d.avatarUrl)
        }}
      />
    </main>
  )
}
