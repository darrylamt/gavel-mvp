import { Facebook, Instagram, Mail, MapPin, Phone, Twitter, Youtube } from 'lucide-react'
import type { ReactNode } from 'react'

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 space-y-16">
      <section className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Connect with Our Team</h1>
        <p className="mx-auto max-w-2xl text-sm text-gray-500">
          Reach out for auction support, buy-now questions, payments, or account help.
        </p>
      </section>

      <section className="grid gap-6 rounded-2xl bg-gray-50 p-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900">Get in Touch with Us</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Your full name"
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Type your email"
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            />
          </div>

          <input
            placeholder="Subject"
            className="mt-3 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
          />

          <textarea
            rows={5}
            placeholder="Send your message request"
            className="mt-3 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
          />

          <button className="mt-4 rounded-md bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            Send message
          </button>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900">Contact Details</h2>
          <p className="mt-2 text-sm text-gray-500">Support channels available for all users.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoCard icon={<MapPin className="h-4 w-4" />} label="Address" value="Greater Accra, Ghana" />
            <InfoCard icon={<Phone className="h-4 w-4" />} label="Mobile" value="(+233) 055 697 9993" />
            <InfoCard icon={<Youtube className="h-4 w-4" />} label="Availability" value="Daily 9:00 AM - 5:00 PM" />
            <InfoCard icon={<Mail className="h-4 w-4" />} label="Email" value="support@gavelgh.com" />
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700">Social Media</p>
            <ul className="mt-2 flex items-center space-x-3">
              <li>
                <a
                  href="https://x.com/gavelgh"
                  aria-label="Twitter"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white transition-all duration-200 hover:bg-blue-600 focus:bg-blue-600"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/share/1XVgK95jJh/"
                  aria-label="Facebook"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white transition-all duration-200 hover:bg-blue-600 focus:bg-blue-600"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/gavel.gh/"
                  aria-label="Instagram"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white transition-all duration-200 hover:bg-blue-600 focus:bg-blue-600"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-gray-50 p-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-gray-900">Your Common Queries Answered with Additional FAQs</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">
            Quick answers to frequently asked questions about auctions and payments.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <FaqRow
              question="What are tokens used for on Gavel?"
              answer="Tokens are used to place bids on auctions. Every bid deducts tokens from your balance."
            />
            <FaqRow
              question="Do my tokens expire?"
              answer="No. Tokens do not expire and remain in your account until they are used for bidding."
            />
            <FaqRow
              question="Can I get a refund for tokens?"
              answer="Token purchases are generally non-refundable once credited. Contact support if you were charged without receiving tokens."
            />
            <FaqRow
              question="How do I contact support quickly?"
              answer="Use the form on this page or email support@gavelgh.com. For urgent help, call (+233) 055 697 9993 during support hours."
            />
            <FaqRow
              question="Are payments secure?"
              answer="Yes. Payments are processed securely through trusted gateways and we do not store card details directly on Gavel."
            />
          </div>

          <div className="space-y-2">
            <FaqRow
              question="What does reserve price mean?"
              answer="Reserve price is the minimum amount the seller is willing to accept. If bidding ends below it, the item is not sold."
            />
            <FaqRow
              question="What is starting price?"
              answer="Starting price is the opening amount for the auction. Bids begin from this value."
            />
            <FaqRow
              question="What is current bid?"
              answer="Current bid is the highest valid bid placed so far in that auction."
            />
            <FaqRow
              question="What is minimum increment?"
              answer="Minimum increment is the smallest amount your next bid must increase above the current bid."
            />
            <FaqRow
              question="What is maximum increment?"
              answer="Maximum increment is the largest amount your next bid can increase above the current bid."
            />
            <FaqRow
              question="What do Scheduled, Live, and Ended mean?"
              answer="Scheduled means bidding has not started yet, Live means bidding is open, and Ended means the auction has closed."
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="rounded bg-black p-1.5 text-white">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-sm text-gray-700">{value}</p>
      </div>
    </div>
  )
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
      <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
        <span>{question}</span>
        <span className="text-gray-500">+</span>
      </summary>
      <p className="pt-2 text-sm text-gray-600">{answer}</p>
    </details>
  )
}
