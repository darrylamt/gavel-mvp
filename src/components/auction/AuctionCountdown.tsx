type Props = {
  endsAt: string
  timeLeft: string
}

export default function AuctionCountdown({
  endsAt,
  timeLeft,
}: Props) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Ends {new Date(endsAt).toLocaleString()}
      </p>

      <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
        ⏳ {timeLeft}
      </div>
    </div>
  )
}
