import Link from 'next/link'

type AuctionCardProps = {
  id: string
  title: string
  currentPrice: number
  endsAt: string
  imageUrl?: string | null
}

export default function AuctionCard({
  id,
  title,
  currentPrice,
  endsAt,
  imageUrl,
}: AuctionCardProps) {
  const timeLeftMs = new Date(endsAt).getTime() - Date.now()
  const isEnded = timeLeftMs <= 0

  return (
    <Link
      href={`/auctions/${id}`}
      className="group block rounded-2xl border bg-white overflow-hidden hover:shadow-lg transition"
    >
      {/* IMAGE */}
      <div className="h-48 bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-4">
        <h3 className="font-semibold text-lg leading-tight mb-2 group-hover:underline">
          {title}
        </h3>

        <p className="text-sm text-gray-500 mb-1">Current bid</p>

        <p className="text-2xl font-bold mb-3">
          GHS {currentPrice.toLocaleString()}
        </p>

        <span
          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
            isEnded
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {isEnded ? 'Ended' : 'Live'}
        </span>
      </div>
    </Link>
  )
}
