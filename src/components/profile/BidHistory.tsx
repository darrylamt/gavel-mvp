export default function BidHistory({ bids }: any) {
  return (
    <section>
      <h2 className="font-semibold mb-3">Your Bids</h2>

      {bids.length === 0 ? (
        <p className="text-sm text-gray-500">
          You haven’t placed any bids yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {bids.map((bid: any) => (
            <li
              key={bid.id}
              className="border p-3 rounded flex justify-between"
            >
              <span>{bid.auctions.title}</span>
              <span className="font-semibold">
                GHS {bid.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
