import Link from 'next/link'

type AuctionCardProps = {
  id: string
  title: string
  currentPrice: number
  endsAt: string
}

export default function AuctionCard({
  id,
  title,
  currentPrice,
  endsAt,
}: AuctionCardProps) {
  const timeLeft =
    new Date(endsAt).getTime() - Date.now()

  const isEnded = timeLeft <= 0

  return (
    <Link
      href={`/auctions/${id}`}
      className="block border rounded-xl p-4 hover:shadow-md transition bg-white"
    >
      {/* Image placeholder (for now) */}
      <div className="h-40 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400">
        Image coming soon
      </div>

      <h3 className="font-semibold text-lg mb-1">
        {title}
      </h3>

      <p className="text-sm text-gray-500 mb-2">
        Current bid
      </p>

      <p className="text-xl font-bold">
        GHS {currentPrice.toLocaleString()}
      </p>

      <span
        className={`inline-block mt-3 px-3 py-1 text-xs font-semibold rounded-full ${
          isEnded
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}
      >
        {isEnded ? 'Ended' : 'Live'}
      </span>
    </Link>
  )
}
