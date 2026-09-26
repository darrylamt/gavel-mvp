import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Payment cancelled | Gavel',
  robots: { index: false },
}

/**
 * Hubtel's default cancellationUrl. Before this page existed, cancelling at
 * checkout landed on a 404 — a dead end inside an in-app browser sheet with no
 * back button.
 */
export default function PaymentCancelledPage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
          <span className="text-2xl font-bold text-gray-400">✕</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Payment cancelled</h1>
        <p className="mt-2 text-sm text-gray-500">
          You haven&apos;t been charged. If you won an auction, you can still pay from your profile
          before the payment deadline.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Go to my profile
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Browse auctions
          </Link>
        </div>
      </div>
    </main>
  )
}
