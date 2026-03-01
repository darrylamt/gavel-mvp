import Image from 'next/image'
import gavelHero from '@/assets/branding/gavel-logo.jpeg'
import { Faq1 } from '@/components/faq1'

export const metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about Gavel Ghana auctions and purchases.',
}

export default function FAQPage() {
  const faqs = [
    {
      id: 'faq-1',
      question: 'How do I start bidding on Gavel?',
      answer:
        'To start bidding, create a free account, buy tokens through Paystack, and place bids on any active auction. The minimum bid increment is set by each auction seller.',
    },
    {
      id: 'faq-2',
      question: 'What happens if I win an auction?',
      answer:
        'Once the auction ends and you have the highest bid, you become the winner. We will notify you via email and SMS. You then have a set time window (usually 24-48 hours) to complete payment. After payment, the item will be prepared for delivery.',
    },
    {
      id: 'faq-3',
      question: 'How do tokens work?',
      answer:
        'Tokens are digital credits used to place bids on Gavel. Each bid typically costs 1 token. Tokens are non-refundable and non-transferable. You can purchase them in packs (35, 120, or 250 tokens) via Paystack.',
    },
    {
      id: 'faq-4',
      question: 'Can I get a refund if I lose an auction?',
      answer:
        'Tokens used for losing bids are non-refundable. This is stated in our Terms of Service. However, if there is a technical issue with the auction itself, contact our support team.',
    },
    {
      id: 'faq-5',
      question: 'What payment methods do you accept?',
      answer:
        'We accept payments through Paystack, which supports MTN Mobile Money, Vodafone Cash, AirtelTigo Money, and all major debit/credit cards issued in Ghana and internationally.',
    },
    {
      id: 'faq-6',
      question: 'How long does delivery take?',
      answer:
        'Delivery times vary by seller and location. Items within Greater Accra typically arrive within 1-3 business days. Items for other regions may take 3-7 business days. Sellers provide estimated delivery dates at checkout.',
    },
    {
      id: 'faq-7',
      question: 'What if my order does not arrive?',
      answer:
        'Contact the seller immediately through the messaging system on Gavel. Most delivery issues are resolved quickly. If unresolved, contact our support team for assistance.',
    },
    {
      id: 'faq-8',
      question: 'Can I cancel an auction bid?',
      answer:
        'No, bids are final once placed. However, if there is a genuine reason (technical error, accidental bid), contact support immediately and provide details. We may be able to assist on a case-by-case basis.',
    },
    {
      id: 'faq-9',
      question: 'What if I accidentally bid too high?',
      answer:
        'Bids are binding commitments. We recommend bidding carefully and only what you can afford. If you win and cannot pay, your account may be restricted. Contact support if there is a genuine technical error.',
    },
    {
      id: 'faq-10',
      question: 'How do I know if a seller is trustworthy?',
      answer:
        "Check the seller's rating, reviews from previous buyers, and their history on Gavel. We also verify seller information during onboarding. Always read product descriptions and ask questions before bidding.",
    },
    {
      id: 'faq-11',
      question: 'Can I return items I purchased?',
      answer:
        "Return policies are set by individual sellers. Check the product description for the seller's return policy before purchasing. For items received in damaged condition, contact the seller immediately with photos.",
    },
    {
      id: 'faq-12',
      question: 'How do I report a fraudulent seller or item?',
      answer:
        'Use the report feature on the product page or contact our support team with details. We take fraud seriously and will investigate. Buyers are protected through our dispute resolution process.',
    },
    {
      id: 'faq-13',
      question: 'What is the reserve price in an auction?',
      answer:
        'A reserve price is the minimum price the seller will accept. If no bid reaches the reserve, the auction may end without a winner. The reserve price protects sellers from selling items below their minimum acceptable price.',
    },
    {
      id: 'faq-14',
      question: 'Can I sell items on Gavel?',
      answer:
        'Yes! Gavel is open to sellers in Ghana. You can apply to become a seller by completing our onboarding process. We verify business information and provide seller support. Sellers both auction items and offer fixed-price products (Buy Now).',
    },
    {
      id: 'faq-15',
      question: 'What are the selling fees?',
      answer:
        'Gavel charges a 10% commission on successful product sales (Buy Now items). Auction fees vary based on final sale price. Payment processing fees depend on your chosen payment method with Paystack.',
    },
    {
      id: 'faq-16',
      question: 'How do I set up delivery zones and pricing?',
      answer:
        "As a seller, you can configure delivery zones for Greater Accra, Greater Accra towns, and other regions in your seller settings. Each zone can have different delivery prices, and you can disable delivery to regions you don't serve.",
    },
    {
      id: 'faq-17',
      question: 'How do I get paid?',
      answer:
        'Funds from sales are transferred to your registered mobile money account (MTN, Vodafone, AirtelTigo) or bank account. Payouts are processed weekly after deductions for commissions and payment processing fees.',
    },
    {
      id: 'faq-18',
      question: 'Why was my account suspended?',
      answer:
        'Accounts are suspended for violations including fraud, non-payment after winning, policy breaches, or suspicious activity. If your account is suspended, check your email for details. Appeal a suspension by contacting support.',
    },
    {
      id: 'faq-19',
      question: 'Is my personal information secure on Gavel?',
      answer:
        'Yes, we use industry-standard encryption and security practices. Your payment information is processed securely through Paystack. We never store full credit card information. See our Privacy Policy for details.',
    },
    {
      id: 'faq-20',
      question: 'What should I do if I have a technical issue?',
      answer:
        'Clear your browser cache, try a different browser or device, or try the mobile app. If the issue persists, contact support with details about what you were doing when the problem occurred.',
    },
  ]

  return (
    <>
      <div className="relative w-full h-64 mb-12">
        <Image
          src={gavelHero}
          alt="Gavel Ghana FAQ"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Frequently Asked Questions</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 pb-16">
        <Faq1 items={faqs} heading="Your Questions Answered" />
      </div>
    </>
  )
}
