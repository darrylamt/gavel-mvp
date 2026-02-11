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
    <section className="bg-white border rounded-xl p-6 flex items-center gap-6">
      <div className="flex-shrink-0">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={username ?? 'avatar'}
            className="w-24 h-24 rounded-full object-cover border"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-700">
            {username ? username[0].toUpperCase() : 'U'}
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {username ?? 'Anonymous'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">Member</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded">
              <span className="text-lg">🪙</span>
              <span className="font-semibold text-amber-700">{tokens}</span>
            </div>

            <button
              onClick={onEdit}
              className="text-sm px-4 py-2 bg-white border rounded hover:bg-gray-50"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
