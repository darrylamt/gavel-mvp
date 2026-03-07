import Link from 'next/link'
import { headers } from 'next/headers'

type WinnerItem = {
  auctionId: string
  auctionTitle: string
  winningAmount: number
  imageUrl: string | null
  winnerName: string
  endedAt: string | null
}

async function getRecentWinners(): Promise<WinnerItem[]> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('host')
  const proto = requestHeaders.get('x-forwarded-proto') || 'https'
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

  try {
    const response = await fetch(`${baseUrl}/api/auctions/recent-winners`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const payload = (await response.json()) as { winners?: WinnerItem[] }
    return payload.winners ?? []
  } catch {
    return []
  }
}

export default async function RecentWinnersPage() {
  const winners = await getRecentWinners()

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Recent Auction Winners</h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          See what people recently won on Gavel and the final winning prices.
        </p>
      </header>

      {winners.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-600">No recent winners available yet.</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {winners.map((winner) => (
            <article
              key={`${winner.auctionId}-${winner.endedAt || 'ended'}`}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="aspect-[4/3] w-full bg-gray-100">
                {winner.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={winner.imageUrl}
                    alt={winner.auctionTitle}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                    No image
                  </div>
                )}
              </div>

              <div className="space-y-2 p-4">
                <h2 className="line-clamp-2 text-base font-semibold text-gray-900">{winner.auctionTitle}</h2>
                <p className="text-sm text-gray-600">
                  Winner: <span className="font-medium text-gray-900">{winner.winnerName}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Won for:{' '}
                  <span className="font-semibold text-green-700">
                    GHS {Number(winner.winningAmount || 0).toLocaleString()}
                  </span>
                </p>
                {winner.endedAt && (
                  <p className="text-xs text-gray-500">
                    Ended: {new Date(winner.endedAt).toLocaleString()}
                  </p>
                )}

                <Link
                  href={`/auctions/${winner.auctionId}`}
                  className="inline-flex rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Auction
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
