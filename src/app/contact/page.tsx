import Link from 'next/link'

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

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Need policy details?</h2>
        <div className="flex flex-wrap gap-3 text-sm font-medium">
          <Link href="/faq" className="rounded-lg border px-3 py-2 hover:bg-gray-50">
            View FAQs
          </Link>
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
