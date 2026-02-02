type Bid = {
  id: string
  amount: number
}

type Props = {
  bids: Bid[]
}

export default function BidList({ bids }: Props) {
  return (
    <>
      <h2 className="mt-6 font-bold">Bids</h2>

      {bids.length === 0 ? (
        <p className="text-sm text-gray-500">No bids yet</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {bids.map((bid) => (
            <li
              key={bid.id}
              className="border p-2 rounded"
            >
              GHS {bid.amount}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
