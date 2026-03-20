import Link from 'next/link'
import { headers } from 'next/headers'
import { Trophy } from 'lucide-react'

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
    const response = await fetch(`${baseUrl}/api/auctions/recent-winners`, { cache: 'no-store' })
    if (!response.ok) return []
    const payload = (await response.json()) as { winners?: WinnerItem[] }
    return payload.winners ?? []
  } catch {
    return []
  }
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default async function RecentWinnersPage() {
  const winners = await getRecentWinners()

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12 sm:px-6">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Trophy className="h-5 w-5 text-amber-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recent Winners</h1>
        </div>
        <p className="text-sm text-gray-500">
          See what people just won on Gavel and the final prices.
        </p>
      </div>

      {winners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Trophy className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-base font-semibold text-gray-700">No recent winners yet</p>
          <p className="mt-1 text-sm text-gray-400">Check back after auctions end.</p>
          <Link href="/auctions" className="mt-4 rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black transition-colors">
            Browse Auctions
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {winners.map((winner) => (
            <article
              key={`${winner.auctionId}-${winner.endedAt || 'ended'}`}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden">
                {winner.imageUrl ? (
                  <img
                    src={winner.imageUrl}
                    alt={winner.auctionTitle}
                    className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300 text-sm">
                    No image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                {/* Won amount overlay */}
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-2.5 py-1 text-xs sm:text-sm font-bold text-white shadow">
                    🏆 GHS {Number(winner.winningAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 sm:p-4">
                <h2 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                  {winner.auctionTitle}
                </h2>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Winner</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{winner.winnerName}</p>
                  </div>
                  {winner.endedAt && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(winner.endedAt)}</span>
                  )}
                </div>
                <Link
                  href={`/auctions/${winner.auctionId}`}
                  className="mt-3 flex items-center justify-center w-full rounded-xl border border-gray-200 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  View Auction
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
