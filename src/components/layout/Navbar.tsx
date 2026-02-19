'use client'

import { Menu, LogOut, Heart, ShoppingCart, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/hooks/useAuthUser'
import AvatarLabelGroup from '@/components/base/avatar/avatar-label-group'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useStarredAuctions } from '@/hooks/useStarredAuctions'
import { useCart } from '@/hooks/useCart'
import navLogo from '@/assets/branding/nav-logo.png'

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
  const { itemCount } = useCart()

  useEffect(() => {
    if (!mobileMenuOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!user) {
      return
    }

    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, token_balance, avatar_url, role')
        .eq('id', user.id)
        .single()

      const profile = (data as ProfileData | null) ?? null
      setProfileUsername(profile?.username ?? null)
      setTokens(profile?.token_balance ?? 0)
      setProfileAvatarUrl(profile?.avatar_url ?? null)
      setProfileRole(profile?.role ?? 'user')
    }

    loadProfile()

    /* Subscribe to profile changes */
    const subscription = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          loadProfile()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }



  return (
    <>
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 md:sticky">
      <div className="w-full px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image src={navLogo} alt="Gavel" className="h-8 w-auto" priority />
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => router.push('/auctions')}
                className="text-sm font-medium uppercase tracking-wide text-gray-700 hover:text-black transition-colors"
              >
                AUCTIONS
              </button>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="text-sm font-medium uppercase tracking-wide text-gray-700 hover:text-black transition-colors"
                  >
                    ADMIN
                  </button>
                )}
              <button
                onClick={() => router.push('/tokens')}
                className="text-sm font-medium uppercase tracking-wide text-gray-700 hover:text-black transition-colors"
              >
                TOKENS
              </button>
              <button
                onClick={() => router.push('/shop')}
                className="text-sm font-medium uppercase tracking-wide text-gray-700 hover:text-black transition-colors"
              >
                SHOP
              </button>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/starred')}
              className="relative hidden rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 md:inline-flex"
              aria-label="Starred auctions"
            >
              <Heart className="h-5 w-5 text-gray-700" />
              {starredCount > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  {starredCount}
                </span>
              )}
            </button>

            <button
              onClick={() => router.push('/cart')}
              className="relative hidden rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 md:inline-flex"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  {itemCount}
                </span>
              )}
            </button>

          {/* Actions */}
            {!loading && user && (
              <button
                onClick={() => router.push('/tokens')}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <span className="text-lg">🪙</span>
                <span className="font-semibold text-amber-700 text-sm">
                  {tokens ?? 0}
                </span>
              </button>
            )}

            {/* User Profile / Auth */}
            {!loading && !user ? (
              <div className="hidden items-center gap-2 md:flex">
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <div className="relative hidden md:block group">
                <AvatarLabelGroup
                  size="md"
                  src={profileAvatarUrl || null}
                  alt={user?.email || 'User'}
                  title={profileUsername || user?.email || 'User'}
                  subtitle={user?.email || undefined}
                  onClick={() => router.push('/profile')}
                />

                {/* Desktop Dropdown */}
                <div className="hidden group-hover:flex absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg flex-col z-50">
                  <button
                    onClick={() => router.push('/profile')}
                    className="px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-200 transition-colors"
                  >
                    My Profile
                  </button>
                  {profileRole === 'seller' && (
                    <button
                      onClick={() => router.push('/seller')}
                      className="px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-200 transition-colors"
                    >
                      Seller Dashboard
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/tokens')}
                    className="px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-200 transition-colors"
                  >
                    Buy Tokens
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[70] bg-white md:hidden">
            <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>

              <button onClick={() => {
                router.push('/')
                setMobileMenuOpen(false)
              }} className="rounded p-1">
                <Image src={navLogo} alt="Gavel" className="h-7 w-auto" priority />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    router.push('/starred')
                    setMobileMenuOpen(false)
                  }}
                  className="relative rounded-lg border border-gray-200 bg-white p-2"
                  aria-label="Starred auctions"
                >
                  <Heart className="h-5 w-5 text-gray-700" />
                  {starredCount > 0 && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                      {starredCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    router.push('/cart')
                    setMobileMenuOpen(false)
                  }}
                  className="relative rounded-lg border border-gray-200 bg-white p-2"
                  aria-label="Cart"
                >
                  <ShoppingCart className="h-5 w-5 text-gray-700" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      {itemCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="px-4 pb-4 pt-3">
              <div className="flex h-[calc(100dvh-5.75rem)] flex-col items-center rounded-3xl border border-gray-200 bg-white px-8 pt-6 text-center shadow-sm">
              {user && (
                <button
                  onClick={() => {
                    router.push('/profile')
                    setMobileMenuOpen(false)
                  }}
                  className="mb-8 flex flex-col items-center gap-2"
                >
                  {profileAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileAvatarUrl}
                      alt={profileUsername || user.email || 'User'}
                      className="h-16 w-16 rounded-full border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-lg font-semibold text-gray-700">
                      {(profileUsername || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="max-w-[12rem] truncate text-base font-semibold text-gray-900">
                    {profileUsername || user.email || 'User'}
                  </p>
                  <p className="rounded-md bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    Tokens: {tokens ?? 0}
                  </p>
                </button>
              )}

              <nav className="flex flex-col items-center gap-5">
                <button
                  onClick={() => {
                    router.push('/auctions')
                    setMobileMenuOpen(false)
                  }}
                  className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900 transition hover:text-black"
                >
                  Auctions
                </button>
                <button
                  onClick={() => {
                    router.push('/tokens')
                    setMobileMenuOpen(false)
                  }}
                  className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900 transition hover:text-black"
                >
                  Tokens
                </button>
                <button
                  onClick={() => {
                    router.push('/shop')
                    setMobileMenuOpen(false)
                  }}
                  className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900 transition hover:text-black"
                >
                  Shop
                </button>
                <button
                  onClick={() => {
                    router.push('/contact')
                    setMobileMenuOpen(false)
                  }}
                  className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900 transition hover:text-black"
                >
                  Contact
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      router.push('/admin')
                      setMobileMenuOpen(false)
                    }}
                    className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900 transition hover:text-black"
                  >
                    Admin
                  </button>
                )}
                {user && profileRole === 'seller' && (
                  <button
                    onClick={() => {
                      router.push('/seller')
                      setMobileMenuOpen(false)
                    }}
                    className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900 transition hover:text-black"
                  >
                    Seller Dashboard
                  </button>
                )}
              </nav>

              <div className="mt-10 flex flex-col items-center gap-3 text-sm text-gray-700">
                {user ? (
                  <>
                    <button
                      onClick={() => {
                        handleLogout()
                        setMobileMenuOpen(false)
                      }}
                      className="font-medium text-red-600 transition hover:text-red-700"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        router.push('/login')
                        setMobileMenuOpen(false)
                      }}
                      className="font-medium transition hover:text-black"
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => {
                        router.push('/signup')
                        setMobileMenuOpen(false)
                      }}
                      className="font-medium transition hover:text-black"
                    >
                      Create account
                    </button>
                  </>
                )}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
    <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  )
}
