'use client'

import { Menu, LogOut, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/hooks/useAuthUser'
import AvatarLabelGroup from '@/components/base/avatar/avatar-label-group'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useStarredAuctions } from '@/hooks/useStarredAuctions'

type ProfileData = {
  username: string | null
  token_balance: number | null
  avatar_url: string | null
}

export default function Navbar() {
  const router = useRouter()
  const { user, loading } = useAuthUser()
  const [tokens, setTokens] = useState<number | null>(null)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isAdmin = useIsAdmin()
  const { starredCount } = useStarredAuctions()

  useEffect(() => {
    if (!user) {
      return
    }

    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, token_balance, avatar_url')
        .eq('id', user.id)
        .single()

      const profile = (data as ProfileData | null) ?? null
      setProfileUsername(profile?.username ?? null)
      setTokens(profile?.token_balance ?? 0)
      setProfileAvatarUrl(profile?.avatar_url ?? null)
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
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="w-full px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="text-2xl font-bold tracking-tight text-black">
                Gavel
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => router.push('/auctions')}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
              >
                Auctions
              </button>
              <button
                onClick={() => router.push('/auctions/cars')}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
              >
                Cars
              </button>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
                  >
                    Admin
                  </button>
                )}
              <button
                onClick={() => router.push('/tokens')}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
              >
                Tokens
              </button>
              <button
                onClick={() => router.push('/faq')}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
              >
                FAQ
              </button>
              <button
                onClick={() => router.push('/contact')}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
              >
                Contact
              </button>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/starred')}
              className="relative p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Starred auctions"
            >
              <Heart className="h-5 w-5 text-gray-700" />
              {starredCount > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  {starredCount}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/login')}
                  className="hidden sm:flex px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <div className="relative group">
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
          <nav className="md:hidden pb-4 flex flex-col gap-2">
            <button
              onClick={() => {
                router.push('/auctions')
                setMobileMenuOpen(false)
              }}
              className="px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Auctions
            </button>
            <button
              onClick={() => {
                router.push('/tokens')
                setMobileMenuOpen(false)
              }}
              className="px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Tokens
            </button>
            <button
              onClick={() => {
                router.push('/auctions/cars')
                setMobileMenuOpen(false)
              }}
              className="px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cars
            </button>
            <button
              onClick={() => {
                router.push('/faq')
                setMobileMenuOpen(false)
              }}
              className="px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              FAQ
            </button>
            <button
              onClick={() => {
                router.push('/contact')
                setMobileMenuOpen(false)
              }}
              className="px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Contact
            </button>
            {user && (
              <button
                onClick={() => {
                  router.push('/profile')
                  setMobileMenuOpen(false)
                }}
                className="px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border-t border-gray-200 mt-2 pt-4"
              >
                My Profile
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
