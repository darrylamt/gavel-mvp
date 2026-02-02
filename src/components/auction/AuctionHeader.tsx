type Props = {
  title: string
  currentPrice: number
}

export default function AuctionHeader({ title, currentPrice }: Props) {
  return (
    <>
      <h1 className="text-2xl font-bold">{title}</h1>

      <p className="mt-2">
        Current price:{' '}
        <strong>GHS {currentPrice}</strong>
      </p>
    </>
  )
}
