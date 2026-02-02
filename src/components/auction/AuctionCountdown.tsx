type Props = {
  endsAt: string
  timeLeft: string
}

export default function AuctionCountdown({ endsAt, timeLeft }: Props) {
  return (
    <>
      <p className="text-sm text-gray-500">
        Ends at: {new Date(endsAt).toLocaleString()}
      </p>

      <p className="mt-1 font-semibold text-blue-600">
        ⏳ {timeLeft}
      </p>
    </>
  )
}
