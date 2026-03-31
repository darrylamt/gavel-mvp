'use client'

import { Menu, LogOut, Heart, ShoppingCart, X, ChevronDown, Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/hooks/useAuthUser'
import AvatarLabelGroup from '@/components/base/avatar/avatar-label-group'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useStarredAuctions } from '@/hooks/useStarredAuctions'
import { useStarredProducts } from '@/hooks/useStarredProducts'
import { useCart } from '@/hooks/useCart'
import navLogo from '@/assets/branding/nav-logo.png'
import NotificationsDropdown from '@/components/layout/NotificationsDropdown'

type ProfileData = {
  username: string | null
  token_balance: number | null
  avatar_url: string | null
  role: string | null
}

export default function Navbar() {
  const router = useRouter()
  const { user, loading } = useAuthUser()
  const [tokens, setTokens] = useState<number | null>(null)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)
  const [profileRole, setProfileRole] = useState<string>('user')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isAdmin = useIsAdmin()
  const { starredCount } = useStarredAuctions()
  const { starredProductCount } = useStarredProducts()
  const { itemCount } = useCart()
  const lockedScrollYRef = useRef(0)
  const totalStarredCount = starredCount + starredProductCount
  const canBecomeSeller = !!user && profileRole !== 'seller' && profileRole !== 'admin'

  const getMetadataFullName = () => {
    if (!user) return null
    const fullName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
      [user.user_metadata?.first_name, user.user_metadata?.last_name]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ')
        .trim()
    return fullName || null
  }

  // Lock scroll when drawer open
  useEffect(() => {
    if (!mobileMenuOpen) return

    lockedScrollYRef.current = window.scrollY
    const prev = {
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
    }

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${lockedScrollYRef.current}px`
    document.body.style.width = '100%'

    return () => {
      document.documentElement.style.overflow = prev.htmlOverflow
      document.body.style.overflow = prev.bodyOverflow
      document.body.style.position = prev.bodyPosition
      document.body.style.top = prev.bodyTop
      document.body.style.width = prev.bodyWidth
      window.scrollTo(0, lockedScrollYRef.current)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!user) {
      setProfileUsername(null)
      setTokens(null)
      setProfileAvatarUrl(null)
      setProfileRole('user')
      return
    }

    const loadProfile = async () => {
      const metadataFullName = getMetadataFullName()
      const { data } = await supabase
        .from('profiles')
        .select('username, token_balance, avatar_url, role')
        .eq('id', user.id)
        .single()

      const profile = (data as ProfileData | null) ?? null
      const nextUsername = profile?.username || metadataFullName || user.email || null

      if (!profile?.username && metadataFullName) {
        await supabase
          .from('profiles')
          .upsert({ id: user.id, username: metadataFullName }, { onConflict: 'id' })
      }

      setProfileUsername(nextUsername)
      setTokens(profile?.token_balance ?? 0)
      setProfileAvatarUrl(profile?.avatar_url ?? null)
      setProfileRole(profile?.role ?? 'user')
    }

    loadProfile()

    const subscription = supabase
      .channel(`profile:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, loadProfile)
      .subscribe()

    return () => { subscription.unsubscribe() }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <>
      {/* ── Main header ── */}
      <header className="fixed inset-x-0 top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 md:sticky">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex h-14 md:h-16 items-center gap-4">

            {/* Mobile: hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex-shrink-0 -ml-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity">
              <Image src={navLogo} alt="Gavel" className="h-7 w-auto" priority />
            </Link>

            {/* Desktop nav links — centered */}
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {/* Auctions dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                  Auctions
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </button>
                <div className="invisible absolute left-0 top-full z-50 pt-1.5 opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150">
                  <div className="w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-xl shadow-black/5">
                    {[
                      { href: '/auctions', label: 'Live Auctions' },
                      { href: '/auctions/winners', label: 'Recent Winners' },
                    ].map(({ href, label }) => (
                      <Link key={href} href={href} className="flex px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <Link href="/shop" className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                Shop
              </Link>

              <Link href="/shop/sellers" className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                Sellers
              </Link>

              <Link href="/tokens" className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                Tokens
              </Link>

              {!loading && user && profileRole === 'seller' && (
                <Link href="/seller" className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                  Seller
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                  Admin
                </Link>
              )}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-1.5 ml-auto md:ml-0">

              {/* Token balance — desktop */}
              {!loading && user && (
                <Link href="/tokens" className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                  <span className="text-sm leading-none">🪙</span>
                  <span className="font-semibold text-amber-700 text-sm leading-none">{tokens ?? 0}</span>
                </Link>
              )}

              {/* Starred — desktop */}
              <Link
                href="/starred"
                className="relative hidden md:flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                aria-label="Starred items"
              >
                <Heart className="h-[1.1rem] w-[1.1rem]" />
                {totalStarredCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white px-1 leading-none">
                    {totalStarredCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                aria-label="Cart"
              >
                <ShoppingCart className="h-[1.1rem] w-[1.1rem]" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-orange-500 flex items-center justify-center text-[9px] font-bold text-white px-1 leading-none">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              <NotificationsDropdown />

              {/* Sell on Gavel — desktop */}
              {!loading && canBecomeSeller && (
                <Link
                  href="/seller/apply"
                  className="hidden lg:flex items-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors whitespace-nowrap"
                >
                  Sell on Gavel
                </Link>
              )}

              {/* Auth */}
              {!loading && !user ? (
                <Link href="/login" className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-black transition-colors whitespace-nowrap">
                  Sign In
                </Link>
              ) : !loading && user ? (
                <div className="relative hidden md:block group">
                  <AvatarLabelGroup
                    size="md"
                    src={profileAvatarUrl || null}
                    alt={user?.email || 'User'}
                    title={profileUsername || user?.email || 'User'}
                    subtitle={user?.email || undefined}
                    onClick={() => router.push('/profile')}
                  />
                  <div className="hidden group-hover:flex absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/5 flex-col z-50 overflow-hidden py-1">
                    {[
                      { href: '/profile/orders', label: 'Track Orders' },
                      { href: '/profile', label: 'My Profile' },
                      ...(profileRole === 'seller' ? [{ href: '/seller', label: 'Seller Dashboard' }] : []),
                      { href: '/tokens', label: 'Buy Tokens' },
                      { href: '/profile/settings', label: 'Settings' },
                    ].map(({ href, label }) => (
                      <button key={href} onClick={() => router.push(href)} className="px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        {label}
                      </button>
                    ))}
                    <div className="h-px bg-gray-100 my-1" />
                    <button onClick={handleLogout} className="px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                      <LogOut className="h-3.5 w-3.5" />
                      Log Out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

          </div>
        </div>
      </header>

      {/* Spacer for fixed nav on mobile */}
      <div className="h-14 md:hidden" aria-hidden="true" />

      {/* ── Mobile drawer overlay ── */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* ── Mobile side drawer ── */}
      <div
        className={`fixed inset-y-0 left-0 z-[70] flex flex-col bg-white md:hidden shadow-2xl transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 'min(85vw, 340px)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100 flex-shrink-0">
          <Link href="/" onClick={closeMenu}>
            <Image src={navLogo} alt="Gavel" className="h-7 w-auto" />
          </Link>
          <button onClick={closeMenu} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close menu">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Profile or auth */}
          {user ? (
            <div className="px-4 py-4 border-b border-gray-100">
              <button
                onClick={() => { router.push('/profile'); closeMenu() }}
                className="flex items-center gap-3 w-full text-left"
              >
                {profileAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700 flex-shrink-0">
                    {(profileUsername || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{profileUsername || user.email}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/tokens" onClick={closeMenu} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">
                  🪙 {tokens ?? 0} tokens
                </Link>
                {canBecomeSeller && (
                  <Link href="/seller/apply" onClick={closeMenu} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700">
                    Become a Seller
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 py-4 border-b border-gray-100 flex gap-2">
              <Link href="/login" onClick={closeMenu} className="flex-1 text-center rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white">
                Sign In
              </Link>
              <Link href="/signup" onClick={closeMenu} className="flex-1 text-center rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700">
                Sign Up
              </Link>
            </div>
          )}

          {/* Nav links */}
          <nav className="px-3 py-2 pb-4">
            <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Marketplace
            </p>
            {[
              { href: '/auctions', label: 'Auctions' },
              { href: '/shop', label: 'Buy Now' },
              { href: '/shop/sellers', label: 'Shops' },
              { href: '/auctions/winners', label: 'Recent Winners' },
              { href: '/tokens', label: 'Tokens' },
              { href: '/contact', label: 'Contact' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                {label}
              </Link>
            ))}

            {user && (
              <>
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  My Account
                </p>
                {[
                  { href: '/profile/orders', label: 'Track Orders' },
                  { href: '/profile', label: 'My Profile' },
                  { href: '/starred', label: 'Starred Items' },
                  { href: '/cart', label: 'Cart' },
                  ...(profileRole === 'seller' ? [{ href: '/seller', label: 'Seller Dashboard' }] : []),
                  ...(isAdmin ? [{ href: '/admin', label: 'Admin Panel' }] : []),
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>

        {/* Drawer footer */}
        {user && (
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 flex items-center gap-4">
            <Link href="/profile/settings" onClick={closeMenu} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={() => { handleLogout(); closeMenu() }}
              className="ml-auto flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        )}
      </div>
    </>
  )
}
