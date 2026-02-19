import Image from 'next/image'
import gavelHero from '@/assets/branding/gavel-logo.jpeg'

const sections = [
  {
    id: 'welcome',
    title: 'Welcome to our website!',
    content: [
      'Welcome to Gavel (the Platform). By accessing or using our marketplace, you agree to these Terms of Service. If you do not agree, do not use the Platform.',
      'Gavel is an auction marketplace where users place bids with tokens and winners complete payment through supported payment providers. Unless explicitly stated, Gavel acts as a marketplace facilitator and not the manufacturer or direct seller of listed items.',
    ],
  },
  {
    id: 'eligibility',
    title: 'User Eligibility and Responsibilities',
    content: [
      'To use Gavel, you must be at least 18 years old, have legal capacity to enter binding agreements, and provide accurate account information.',
      'You are responsible for protecting your account credentials and for all activity that occurs under your account.',
    ],
    bullets: [
      'Be at least 18 years old',
      'Provide truthful registration information',
      'Maintain account security and confidentiality',
      'Notify us promptly of unauthorized access',
    ],
  },
  {
    id: 'account-management',
    title: 'Account Creation and Management',
    content: [
      'You agree to keep your profile details current and accurate. We may suspend or terminate accounts involved in fraud, abuse, or manipulation of platform systems.',
    ],
    bullets: [
      'False or misleading profile details',
      'Fraudulent or abusive behavior',
      'Auction manipulation or bid interference',
      'Token abuse or payment abuse',
    ],
  },
  {
    id: 'tokens',
    title: 'Token Purchases and Usage',
    content: [
      'Tokens are digital credits used to place bids on Gavel. Tokens are not currency, are non-transferable, and are not redeemable for cash.',
      'All token purchases are final except where applicable law requires otherwise. Payment processing is handled by third-party providers.',
    ],
    bullets: [
      'A successful bid placement deducts tokens',
      'Token deduction does not guarantee winning',
      'Bid tokens are non-refundable even if you do not win',
      'Gavel is not liable for third-party payment processor failures',
    ],
  },
  {
    id: 'auction-rules',
    title: 'Auction Participation Rules',
    content: [
      'All bids are binding. If you place a winning bid, you are required to complete payment within the allowed window.',
      'Gavel may cancel auctions, reverse fraudulent bids, disqualify suspicious accounts, or correct technical errors where needed to maintain platform integrity.',
      'Anti-sniping protections may extend closing time when valid bids are submitted near auction close.',
    ],
  },
  {
    id: 'winner-payment',
    title: 'Winner Payment and Fallback',
    bullets: [
      'The current winner has one (1) hour to complete payment after payment rights are assigned',
      'If payment is not completed in time, payment rights may pass to the next highest eligible bidder above reserve',
      'Fallback may continue while reserve conditions are still met',
      'If no remaining bidder meets reserve, the item closes unsold',
      'Failure to pay may result in forfeiture of purchase rights and account penalties',
      'Gavel may relist unpaid or unsold items',
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping and Delivery',
    content: [
      'Sellers are responsible for shipping and delivery commitments. Gavel does not guarantee shipping timelines and is not responsible for delivery disputes between buyers and sellers.',
    ],
    bullets: ['Lost packages', 'Damaged goods', 'Delivery delays', 'Incorrect addresses provided by users'],
  },
  {
    id: 'conduct',
    title: 'Acceptable Use and Conduct',
    content: ['You must not misuse the Platform or interfere with auctions, payments, or user safety.'],
    bullets: [
      'No bots or automated bidding tools',
      'No multi-account abuse',
      'No fraud or chargeback abuse',
      'No reverse engineering or attempts to bypass security',
    ],
  },
  {
    id: 'availability',
    title: 'Platform Availability',
    content: [
      'We strive for reliable service, but we do not guarantee uninterrupted uptime, error-free operation, or immediate processing in all cases.',
      'We may suspend, update, or modify Platform functionality at any time to improve service quality, security, or compliance.',
    ],
  },
  {
    id: 'third-party',
    title: 'Third-Party Services',
    content: [
      'Gavel depends on third-party providers for payment, hosting, and authentication. We are not responsible for outages or failures caused by third-party systems.',
    ],
  },
  {
    id: 'ip',
    title: 'Intellectual Property Rights',
    content: [
      'All platform content, branding, software, and systems are owned by or licensed to Gavel. You may not copy, reproduce, modify, distribute, or reverse engineer platform assets without written permission.',
    ],
  },
  {
    id: 'payment-refund',
    title: 'Payment and Refund Policy',
    content: [
      'Token purchases are final except where required by law. Auction win payments must be completed within the stated deadline to maintain purchase rights.',
    ],
  },
  {
    id: 'liability',
    title: 'Disclaimer of Warranties and Limitation of Liability',
    content: [
      'The Platform is provided “as is” and “as available,” without warranties of merchantability, fitness for a particular purpose, or guaranteed listing accuracy.',
      'To the maximum extent permitted by law, Gavel is not liable for indirect damages, lost profits, lost data, auction outcome losses, or shipping disputes. Our total liability is limited to amounts paid by you in the prior 30 days.',
    ],
  },
  {
    id: 'fraud',
    title: 'Fraud Prevention and Enforcement',
    content: [
      'We may investigate suspicious activity, freeze affected accounts, reverse suspicious transactions, and cooperate with law enforcement where required by law.',
      'Fraudulent chargebacks or confirmed abuse may result in permanent account bans.',
    ],
  },
  {
    id: 'termination',
    title: 'Suspension and Termination',
    content: [
      'We may suspend or terminate accounts for Terms violations, suspected fraud, abusive behavior, or failure to complete auction obligations. Termination may include loss of account access and remaining tokens where permitted by law.',
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law and Dispute Handling',
    content: [
      'These Terms are governed by applicable laws in the jurisdiction where Gavel operates. Disputes will be handled by competent courts in that jurisdiction unless applicable law requires otherwise.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    content: [
      'We may update these Terms from time to time. Continued use of the Platform after updates means you accept the revised Terms.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Information',
    content: ['For questions about these Terms, contact support@gavelgh.com.'],
  },
]

export default function TermsPage() {
  return (
    <main className="bg-gray-100 pb-12">
      <section className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200">
          <Image
            src={gavelHero}
            alt="Terms of Service"
            className="h-40 w-full object-cover md:h-52"
            priority
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 flex items-end p-5 md:p-7">
            <div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">Terms of Service</h1>
              <p className="mt-2 text-sm text-white/80">Last Updated: February 19, 2026</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid w-full max-w-6xl gap-6 px-4 md:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800">Table of Contents</h2>
          <nav className="mt-3 space-y-1">
            {sections.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-lg px-2 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-black"
              >
                {index + 1}. {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 border-b border-gray-100 pb-8 last:border-b-0 last:pb-0">
                <h2 className="text-xl font-semibold text-gray-900 md:text-2xl">
                  {index + 1}. {section.title}
                </h2>

                {section.content?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 leading-7 text-gray-700">
                    {paragraph}
                  </p>
                ))}

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-gray-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}
