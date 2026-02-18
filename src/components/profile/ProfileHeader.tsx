import React from 'react'

type Props = {
  username: string | null
  tokens: number
  avatarUrl?: string | null
  onEdit?: () => void
}

export default function ProfileHeader({
  username,
  tokens,
  avatarUrl,
  onEdit,
}: Props) {
  return (
    <section className="rounded-xl border bg-white p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex-shrink-0">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={username ?? 'avatar'}
            className="h-20 w-20 rounded-full border object-cover sm:h-24 sm:w-24"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-700 sm:h-24 sm:w-24">
            {username ? username[0].toUpperCase() : 'U'}
          </div>
        )}
          </div>

          <div>
            <h1 className="truncate text-2xl font-bold leading-tight">
              {username ?? 'Anonymous'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">Member</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded bg-amber-50 px-3 py-1">
            <span className="text-lg">🪙</span>
            <span className="font-semibold text-amber-700">{tokens}</span>
          </div>

          <button
            onClick={onEdit}
            className="rounded border bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </section>
  )
}
