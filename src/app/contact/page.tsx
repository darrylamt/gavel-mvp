import Link from 'next/link'
import { Faq1 } from '@/components/faq1'

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Contact Gavel</h1>
        <p className="text-gray-600">
          Reach out for auction support, payment help, account access issues, or policy questions.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 shadow-sm space-y-2">
          <h2 className="text-base font-semibold text-gray-900">Support Email</h2>
          <p className="text-sm text-gray-700">support@gavelgh.com</p>
          <p className="text-sm text-gray-600">Please include your auction ID or payment reference for faster help.</p>
        </article>

        <article className="rounded-2xl border bg-white p-5 shadow-sm space-y-2">
          <h2 className="text-base font-semibold text-gray-900">Support Hours</h2>
          <p className="text-sm text-gray-700">Monday - Friday, 9:00 AM - 5:00 PM (GMT)</p>
          <p className="text-sm text-gray-600">Most requests are answered within 24 hours.</p>
        </article>
      </section>

      <section className="rounded-2xl border bg-gray-50 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">What to include in your message</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
          <li>Your account email</li>
          <li>Auction ID or product name</li>
          <li>Payment reference (if payment-related)</li>
          <li>Brief description of the issue</li>
        </ul>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <Faq1
          heading="Frequently asked questions"
          className="w-full py-0"
          items={[
            {
              id: 'reserve-price',
              question: 'What is a reserve price?',
              answer:
                'A reserve price is the minimum bid required for a valid sale. Only bidders at or above reserve can be offered payment. If no eligible bidder remains above reserve, the auction closes unsold.',
            },
            {
              id: 'refund-tokens',
              question: 'Do bid tokens get refunded?',
              answer:
                'No. Bid tokens are consumed when bids are placed and are non-refundable, including non-winning bids, reserve-not-met outcomes, and missed payment windows.',
            },
            {
              id: 'anti-sniping',
              question: 'What happens if someone bids in the final seconds?',
              answer:
                'Anti-sniping is active. If a bid is placed in the last 30 seconds, the auction end time is extended by 30 seconds.',
            },
            {
              id: 'winner-window',
              question: 'How long does the winner have to pay?',
              answer:
                'The current winner has 1 hour to complete payment. A countdown appears on the auction winner card during this payment window.',
            },
            {
              id: 'winner-fallback',
              question: 'What if the winner does not pay in time?',
              answer:
                'If the winner misses the 1-hour deadline, payment rights move to the next highest eligible bidder above reserve (2nd, then 3rd, and so on).',
            },
            {
              id: 'below-reserve-fallback',
              question: 'What if the next bidder is below reserve?',
              answer:
                'If the next bidder is below reserve, they are not eligible for fallback payment. If no remaining bidder meets reserve, the auction closes unsold.',
            },
          ]}
        />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Need policy details?</h2>
        <div className="flex flex-wrap gap-3 text-sm font-medium">
          <Link href="/terms" className="rounded-lg border px-3 py-2 hover:bg-gray-50">
            Terms & Conditions
          </Link>
          <Link href="/privacy" className="rounded-lg border px-3 py-2 hover:bg-gray-50">
            Privacy Policy
          </Link>
        </div>
      </section>
    </main>
  )
}
