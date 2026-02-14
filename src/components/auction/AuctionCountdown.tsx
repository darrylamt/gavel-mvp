type Props = {
  targetAt: string | null
  phase: 'starts' | 'ends' | 'ended'
  timeLeft: string
}

export default function AuctionCountdown({
  targetAt,
  phase,
  timeLeft,
}: Props) {
  const label = phase === 'starts' ? 'Starts' : 'Ends'
  const badgePrefix = phase === 'starts' ? 'Starts in' : phase === 'ends' ? 'Ends in' : ''

  return (
    <div className="mt-3 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        {targetAt ? `${label} ${new Date(targetAt).toLocaleString()}` : null}
      </p>

      <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
        ⏳ {badgePrefix ? `${badgePrefix} ${timeLeft}` : timeLeft}
      </div>
    </div>
  )
}
