type Props = {
  title: string
  currentPrice: number
  bidderCount?: number
  watcherCount?: number
  showBidders?: boolean
  showWatchers?: boolean
}

export default function AuctionHeader({
  title,
  currentPrice,
  bidderCount,
  watcherCount,
  showBidders = false,
  showWatchers = false,
}: Props) {
  return (
    <div className="mb-4">
      <h1 className="text-3xl font-extrabold mb-1">
        {title}
      </h1>

      <p className="text-lg text-gray-700">
        Current price{' '}
        <span className="font-bold text-black">
          GHS {currentPrice}
        </span>
      </p>

      {showBidders && typeof bidderCount === 'number' && (
        <p className="mt-1 text-sm font-medium text-blue-700">
          {bidderCount} bidder{bidderCount === 1 ? '' : 's'} in this auction
        </p>
      )}

      {showWatchers && typeof watcherCount === 'number' && (
        <p className="mt-1 text-sm font-medium text-purple-700">
          {watcherCount} people watching this auction
        </p>
      )}
    </div>
  )
}
