import { Faq1 } from '@/components/faq1'

export default function FaqPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 sm:px-6">
      <Faq1
        className="w-full py-8 sm:py-12"
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
    </main>
  )
}
