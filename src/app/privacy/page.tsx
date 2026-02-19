import Image from 'next/image'
import gavelHero from '@/assets/branding/gavel-logo.jpeg'

const sections = [
  {
    id: 'welcome',
    title: 'Welcome to our website!',
    content: [
      'This Privacy Policy explains how Gavel collects, uses, stores, and shares personal data when you use our auction marketplace.',
      'By using Gavel, you agree to the data practices described in this policy. If you do not agree, you should discontinue use of the Platform.',
    ],
  },
  {
    id: 'information',
    title: 'Information We Collect',
    bullets: [
      'Account data such as email, username, avatar, phone, and address',
      'Auction activity such as bids, watch history, timestamps, and outcomes',
      'Token and payment records including references, status, and transaction logs',
      'Technical and security data such as IP-related logs, browser metadata, and usage events',
    ],
  },
  {
    id: 'usage',
    title: 'How We Use Information',
    bullets: [
      'Operate auctions, reserve checks, and winner fallback payment windows',
      'Process token purchases and auction payments through payment providers',
      'Detect and prevent fraud, abuse, and platform manipulation',
      'Provide support, service updates, and account security actions',
      'Improve reliability, performance, and user experience',
    ],
  },
  {
    id: 'legal-basis',
    title: 'Legal Bases and Compliance',
    content: [
      'We process personal data where needed to provide the service, comply with legal obligations, prevent fraud, and protect users and the Platform.',
    ],
  },
  {
    id: 'sharing',
    title: 'Data Sharing',
    content: [
      'We may share limited personal data with trusted service providers that support payment processing, hosting, authentication, analytics, and security monitoring.',
      'We may disclose information when required by law, court order, or to investigate fraud, abuse, or security incidents.',
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention',
    content: [
      'We retain account, bid, token, payment, and support records for operational, legal, security, and dispute-handling purposes. Retention periods may vary by data type and applicable law.',
    ],
  },
  {
    id: 'security',
    title: 'Data Security',
    content: [
      'We use reasonable technical and organizational safeguards to protect personal data. No system is completely secure, and users are responsible for protecting account credentials.',
    ],
  },
  {
    id: 'rights',
    title: 'Your Rights',
    content: [
      'Subject to applicable law, you may request access, correction, or deletion of personal data. Some records may still be retained where required for legal, fraud-prevention, or security reasons.',
    ],
  },
  {
    id: 'children',
    title: 'Children’s Privacy',
    content: [
      'Gavel is not intended for users under 18 years old. We do not knowingly collect personal data from children. If we learn that such data was submitted, we will take steps to remove it where required.',
    ],
  },
  {
    id: 'international',
    title: 'International Transfers',
    content: [
      'Your information may be processed in jurisdictions where our service providers operate. We take reasonable steps to ensure appropriate safeguards for transferred data.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this Policy',
    content: [
      'We may update this Privacy Policy from time to time. Continued use of Gavel after updates means you accept the revised policy.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    content: ['For privacy questions or requests, contact support@gavelgh.com.'],
  },
]

export default function PrivacyPage() {
  return (
    <main className="bg-gray-100 pb-12">
      <section className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200">
          <Image
            src={gavelHero}
            alt="Privacy Policy"
            className="h-40 w-full object-cover md:h-52"
            priority
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 flex items-end p-5 md:p-7">
            <div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">Privacy Policy</h1>
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
