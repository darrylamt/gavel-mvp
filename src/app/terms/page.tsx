export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">
        Terms of Service
      </h1>

      <p className="text-sm text-gray-600 mb-6">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section className="space-y-4 text-gray-700">
        <p>
          Welcome to Gavel. By accessing or using our platform,
          you agree to be bound by these Terms of Service.
        </p>

        <h2 className="text-xl font-semibold">
          1. Eligibility
        </h2>
        <p>
          You must be at least 18 years old to use Gavel.
        </p>

        <h2 className="text-xl font-semibold">
          2. Auctions & Bidding
        </h2>
        <p>
          All bids are binding. Bids consume tokens and
          cannot be reversed once placed.
        </p>

        <h2 className="text-xl font-semibold">
          3. Payments
        </h2>
        <p>
          Winning bidders are required to complete payment
          within the specified time. Failure to pay may
          result in penalties or account restrictions.
        </p>

        <h2 className="text-xl font-semibold">
          4. Prohibited Use
        </h2>
        <p>
          You agree not to misuse the platform, manipulate
          auctions, or engage in fraudulent activity.
        </p>

        <h2 className="text-xl font-semibold">
          5. Changes
        </h2>
        <p>
          We may update these terms at any time. Continued
          use of the platform means you accept the changes.
        </p>
      </section>
    </main>
  )
}
