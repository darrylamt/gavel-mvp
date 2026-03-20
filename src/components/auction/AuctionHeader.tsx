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
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-1">
        {title}
      </h1>

      <p className="text-sm text-gray-500">
        Current price{' '}
        <span className="font-bold text-gray-900">
          GHS {currentPrice.toLocaleString()}
        </span>
      </p>

      {showBidders && typeof bidderCount === 'number' && (
        <p className="mt-1 text-xs font-semibold text-orange-600">
          {bidderCount} bidder{bidderCount === 1 ? '' : 's'}
        </p>
      )}

      {showWatchers && typeof watcherCount === 'number' && (
        <p className="mt-1 text-xs font-semibold text-gray-500">
          {watcherCount} watching
        </p>
      )}
    </div>
  )
}
