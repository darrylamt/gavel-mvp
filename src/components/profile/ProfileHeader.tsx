type Props = {
  username: string | null
  tokens: number
}

export default function ProfileHeader({
  username,
  tokens,
}: Props) {
  return (
    <section className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold">
        {username ? username[0].toUpperCase() : 'U'}
      </div>

      <div>
        <h1 className="text-2xl font-bold">
          {username ?? 'Anonymous'}
        </h1>
        <p className="text-sm text-gray-600">
          🪙 {tokens} tokens
        </p>
      </div>
    </section>
  )
}
