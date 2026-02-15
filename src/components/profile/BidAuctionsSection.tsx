import Link from 'next/link'
import { buildAuctionPath } from '@/lib/seo'

type BidAuction = {
  auctionId: string
  title: string
  yourHighestBid: number
  currentPrice: number
  status: string
}

type Props = {
  auctions: BidAuction[]
}

export default function BidAuctionsSection({ auctions }: Props) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">Auctions You Bid On</h2>

      {auctions.length === 0 ? (
        <p className="text-sm text-gray-500">You have not placed bids on any auctions yet.</p>
      ) : (
        <div className="space-y-3">
          {auctions.map((auction) => (
            <div key={auction.auctionId} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{auction.title}</p>
                <p className="text-sm text-gray-600">
                  Your highest: GHS {auction.yourHighestBid.toLocaleString()} · Current: GHS {auction.currentPrice.toLocaleString()}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">{auction.status}</p>
              </div>

              <Link
                href={buildAuctionPath(auction.auctionId, auction.title)}
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}