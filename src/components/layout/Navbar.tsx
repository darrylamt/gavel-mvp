'use client'

import { Menu, LogOut, Heart, ShoppingCart, X, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/hooks/useAuthUser'
import AvatarLabelGroup from '@/components/base/avatar/avatar-label-group'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useStarredAuctions } from '@/hooks/useStarredAuctions'
import { useStarredProducts } from '@/hooks/useStarredProducts'
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

  useEffect(() => {
    if (!mobileMenuOpen) {
      return
    }

    lockedScrollYRef.current = window.scrollY

    const previousBodyOverflow = document.body.style.overflow
    const previousBodyPosition = document.body.style.position
    const previousBodyTop = document.body.style.top
    const previousBodyWidth = document.body.style.width
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${lockedScrollYRef.current}px`
    document.body.style.width = '100%'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.position = previousBodyPosition
      document.body.style.top = previousBodyTop
      document.body.style.width = previousBodyWidth
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
          .upsert(
            {
              id: user.id,
              username: metadataFullName,
            },
            { onConflict: 'id' }
          )
      }

      setProfileUsername(nextUsername)
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
              <div className="relative group">
                <button
                  className="inline-flex items-center gap-1 text-sm font-medium uppercase tracking-wide text-gray-700 transition-colors hover:text-black"
                >
                  MARKET
                  <ChevronDown className="h-4 w-4" />
                </button>

                <div className="invisible absolute left-0 top-full z-50 mt-3 w-44 rounded-lg border border-gray-200 bg-white p-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                  <button
                    onClick={() => router.push('/auctions')}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
                  >
                    Auctions
                  </button>
                  <button
                    onClick={() => router.push('/shop')}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
                  >
                    Buy Now
                  </button>
                </div>
              </div>

              <button
                onClick={() => router.push('/shop/sellers')}
                className="text-sm font-medium uppercase tracking-wide text-gray-700 hover:text-black transition-colors"
              >
                SHOPS
              </button>
              {!loading && user && profileRole === 'seller' && (
                <button
                  onClick={() => router.push('/seller')}
                  className="text-sm font-medium uppercase tracking-wide text-gray-700 hover:text-black transition-colors"
                >
                  SELLER
                </button>
              )}
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
              {totalStarredCount > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  {totalStarredCount}
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

            {!loading && canBecomeSeller && (
              <button
                onClick={() => router.push('/seller/apply')}
                className="hidden md:inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Become a Seller
              </button>
            )}

            {/* User Profile / Auth */}
            {!loading && !user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/login')}
                  className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 md:px-4"
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
            <div className="flex h-16 items-center justify-between bg-white px-4">
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
                  className="relative rounded-lg bg-white p-2"
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
                  className="relative rounded-lg bg-white p-2"
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

            <div className="flex h-[calc(100dvh-4rem)] flex-col items-center bg-white px-8 pt-6 text-center">
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
                    router.push('/shop')
                    setMobileMenuOpen(false)
                  }}
                  className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900 transition hover:text-black"
                >
                  Buy Now
                </button>
                <button
                  onClick={() => {
                    router.push('/shop/sellers')
                    setMobileMenuOpen(false)
                  }}
                  className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900 transition hover:text-black"
                >
                  Shops
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
                {canBecomeSeller && (
                  <button
                    onClick={() => {
                      router.push('/seller/apply')
                      setMobileMenuOpen(false)
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
                  >
                    Become a Seller
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
        )}
      </div>
    </header>
    <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  )
}
