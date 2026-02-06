type Props = {
  title: string
  currentPrice: number
}

export default function AuctionHeader({
  title,
  currentPrice,
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
    </div>
  )
}
