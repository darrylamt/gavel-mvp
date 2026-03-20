'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { MapPin, AlertTriangle } from 'lucide-react'

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
  delivery_location: string | null
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
  const { user: authUser, loading: authLoading, isChecking } = useAuthGuard()

  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [tokens, setTokens] = useState<number>(0)
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([])
  const [bidAuctions, setBidAuctions] = useState<BidAuctionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [onboardingHandled, setOnboardingHandled] = useState(false)
  const [canAccessSellerDashboard, setCanAccessSellerDashboard] = useState(false)

  const loadWonAuctions = async (uid: string) => {
    const { data } = await supabase.rpc('get_auctions_won_by_user', { uid })
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
    if (authLoading || isChecking) return
    if (!authUser) return

    const loadProfile = async () => {
      setUserId(authUser.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, token_balance, phone, sms_opt_in, sms_marketing_opt_in, address, delivery_location, avatar_url, role')
        .eq('id', authUser.id)
        .single()

      const profileData = (profile as ProfileData | null) ?? null

      const metadataFullName =
        (typeof authUser.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name.trim()) ||
        [authUser.user_metadata?.first_name, authUser.user_metadata?.last_name]
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          .join(' ')
          .trim()

      setUsername(profileData?.username ?? (metadataFullName || null))
      setTokens(profileData?.token_balance ?? 0)
      setPhone(profileData?.phone ?? '')
      setAddress(profileData?.address ?? '')
      setDeliveryLocation(profileData?.delivery_location ?? '')
      setAvatarUrl(profileData?.avatar_url ?? null)

      if (profileData?.role === 'seller') {
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
  }, [authUser, authLoading, isChecking])

  useEffect(() => {
    const onboarding = searchParams.get('onboarding')
    if (loading || onboardingHandled || onboarding !== '1') return
    const timer = window.setTimeout(() => {
      setEditOpen(true)
      setOnboardingHandled(true)
      router.replace('/profile')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loading, onboardingHandled, router, searchParams])

  const payNow = async (auctionId: string) => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user || !auth.user.email) return
    const res = await fetch('/api/auction-payments/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auction_id: auctionId, user_id: auth.user.id, email: auth.user.email }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Payment failed'); return }
    window.location.href = data.authorization_url
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 text-center">
        <p className="text-sm text-gray-500">Please sign in to view your profile.</p>
        <Link href="/login" className="mt-4 inline-block rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black transition-colors">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <ProfileHeader
        username={username}
        tokens={tokens}
        avatarUrl={avatarUrl}
        onEdit={() => setEditOpen(true)}
        canAccessSellerDashboard={canAccessSellerDashboard}
      />

      {/* Delivery location warning */}
      {!deliveryLocation && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <MapPin className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            You haven&apos;t set a default delivery location.{' '}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="font-semibold underline underline-offset-2"
            >
              Set it now →
            </button>
          </p>
        </div>
      )}

      {/* Seller quick access – delivery zones reminder only */}
      {canAccessSellerDashboard && (
        <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white shadow-sm p-4 sm:p-5">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Make sure your{' '}
            <Link href="/seller/shop" className="font-semibold underline underline-offset-2 hover:text-amber-900">
              delivery zones
            </Link>{' '}
            are up to date so buyers see accurate fees.
          </p>
        </div>
      )}

      <ContactDetailsSection phone={phone} address={address} />
      <WonAuctionsSection auctions={wonAuctions} onPay={payNow} />
      <BidAuctionsSection auctions={bidAuctions} />
      <SignOutButton />

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        userId={userId!}
        initialUsername={username ?? undefined}
        initialPhone={phone}
        initialAddress={address}
        initialDeliveryLocation={deliveryLocation}
        initialAvatarUrl={avatarUrl}
        onSaved={(d: {
          username?: string
          phone?: string
          address?: string
          deliveryLocation?: string
          avatarUrl?: string
        }) => {
          if (d.username) setUsername(d.username)
          if (typeof d.phone !== 'undefined') setPhone(d.phone)
          if (typeof d.address !== 'undefined') setAddress(d.address)
          if (typeof d.deliveryLocation !== 'undefined') setDeliveryLocation(d.deliveryLocation)
          if (d.avatarUrl) setAvatarUrl(d.avatarUrl)
        }}
      />
    </main>
  )
}
