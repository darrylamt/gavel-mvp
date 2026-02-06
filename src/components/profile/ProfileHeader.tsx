import { getAvatarLetter } from '@/lib/avatar'

export default function ProfileHeader({
  username,
}: {
  username: string | null
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold">
        {getAvatarLetter(username)}
      </div>

      <div>
        <p className="text-xl font-semibold">
          {username ?? 'Anonymous'}
        </p>
        <p className="text-sm text-gray-500">
          This is your public identity
        </p>
      </div>
    </div>
  )
}
