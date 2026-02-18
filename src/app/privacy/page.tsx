export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-600">Last Updated: February 18, 2026</p>
      </div>

      <section className="space-y-4 text-gray-700">
        <p>
          This Privacy Policy explains how Gavel collects, uses, stores, and shares personal data
          when you use our auction marketplace.
        </p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">1. Information We Collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account data such as email, username, avatar, phone, and address.</li>
          <li>Auction activity such as bids, watched auctions, timestamps, and outcomes.</li>
          <li>Token and payment records such as purchase references, payment status, and transaction logs.</li>
          <li>Technical data such as IP-related security logs, browser metadata, and usage events.</li>
        </ul>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">2. How We Use Information</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>To operate auctions, including reserve-price checks and winner fallback payment windows.</li>
          <li>To process token purchases and auction payments through payment providers.</li>
          <li>To enforce anti-fraud, anti-abuse, and anti-sniping auction protections.</li>
          <li>To provide customer support, service updates, and account security actions.</li>
          <li>To monitor platform performance and improve reliability and user experience.</li>
        </ul>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">3. Legal Bases and Compliance</h2>
        <p>We process data where needed to provide the service, comply with legal obligations, prevent fraud, and protect users and the platform.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">4. Sharing of Data</h2>
        <p>We may share limited data with trusted providers that help us run the platform, including payment, hosting, and authentication services.</p>
        <p>We may disclose information when required by law or to investigate fraud, abuse, or security incidents.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">5. Data Retention</h2>
        <p>
          We retain account, bid, token, and payment records for operational, security, legal, and dispute-handling purposes. Retention periods may vary by data type and legal requirements.
        </p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">6. Data Security</h2>
        <p>
          We use reasonable technical and organizational safeguards to protect personal data. No system is completely secure, and users are responsible for protecting account credentials.
        </p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">7. Your Rights</h2>
        <p>
          Subject to applicable law, you may request access, correction, or deletion of personal data. Certain records may be retained where required for legal or security reasons.
        </p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">8. Contact</h2>
        <p>For privacy questions or requests, contact support@gavelgh.com.</p>
      </section>
    </main>
  )
}
