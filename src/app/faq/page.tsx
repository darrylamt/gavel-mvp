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
              'A reserve price is the minimum final bid required for an item to be sold. If the highest bid is below reserve when the auction ends, the item is not sold.',
          },
          {
            id: 'refund-tokens',
            question: 'Do I get my bid tokens back if I do not win?',
            answer:
              'Yes. If you do not win an auction, your spent bid tokens are refunded after settlement. If reserve is not met, all bidders are treated as non-winning bidders and refunds are processed.',
          },
          {
            id: 'anti-sniping',
            question: 'What happens if someone bids in the final seconds?',
            answer:
              'To prevent sniping, bids placed in the last 30 seconds can extend the auction by an additional 30 seconds.',
          },
          {
            id: 'winner-payment',
            question: 'When does a winner pay?',
            answer:
              'If reserve is met, the highest bidder is the winner and can complete payment from the auction page or profile.',
          },
        ]}
      />
    </main>
  )
}
