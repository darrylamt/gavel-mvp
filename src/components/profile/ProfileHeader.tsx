import React from 'react'
import Link from 'next/link'
import { Store } from 'lucide-react'

type Props = {
  username: string | null
  tokens: number
  avatarUrl?: string | null
  onEdit?: () => void
  canAccessSellerDashboard?: boolean
}

export default function ProfileHeader({
  username,
  tokens,
  avatarUrl,
  onEdit,
  canAccessSellerDashboard = false,
}: Props) {
  const displayName = username ?? 'Anonymous'
  const mobileNameSizeClass =
    displayName.length > 18
      ? 'text-base'
      : displayName.length > 12
        ? 'text-lg'
        : 'text-xl'

  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + name */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={username ?? 'avatar'}
                className="h-16 w-16 rounded-full border-2 border-gray-100 object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600 sm:h-20 sm:w-20 sm:text-2xl">
                {username ? username[0].toUpperCase() : 'U'}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1 className={`max-w-[10.5rem] truncate font-bold leading-tight ${mobileNameSizeClass} sm:max-w-none sm:text-2xl`}>
              {displayName}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Member</p>
          </div>
        </div>

        {/* Right side: tokens + seller + edit */}
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          {/* Token + seller button on same line */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-1.5">
              <span className="text-base leading-none">🪙</span>
              <span className="text-sm font-bold text-amber-700">{tokens}</span>
            </div>
            {canAccessSellerDashboard && (
              <Link
                href="/seller"
                className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-black transition-colors"
              >
                <Store className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Seller</span>
              </Link>
            )}
          </div>

          <button
            onClick={onEdit}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </section>
  )
}
