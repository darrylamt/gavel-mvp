export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">
        Privacy Policy
      </h1>

      <p className="text-sm text-gray-600 mb-6">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section className="space-y-4 text-gray-700">
        <p>
          Your privacy is important to us. This policy
          explains how we collect and use your data.
        </p>

        <h2 className="text-xl font-semibold">
          Information We Collect
        </h2>
        <p>
          We collect account information such as email,
          username, bids, token balance, and transactions.
        </p>

        <h2 className="text-xl font-semibold">
          How We Use Information
        </h2>
        <p>
          Your information is used to operate auctions,
          process payments, and improve the platform.
        </p>

        <h2 className="text-xl font-semibold">
          Data Security
        </h2>
        <p>
          We use industry-standard practices to protect
          your data, but no system is 100% secure.
        </p>

        <h2 className="text-xl font-semibold">
          Contact
        </h2>
        <p>
          If you have privacy concerns, contact us via
          the Contact page.
        </p>
      </section>
    </main>
  )
}
