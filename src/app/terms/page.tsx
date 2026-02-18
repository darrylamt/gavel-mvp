export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gavel Terms and Conditions</h1>
        <p className="text-sm text-gray-600">Last Updated: February 18, 2026</p>
      </div>

      <section className="space-y-4 text-gray-700">
        <p>Welcome to Gavel (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;).</p>
        <p>
          By accessing or using Gavel, you agree to be legally bound by these Terms and Conditions
          (&quot;Terms&quot;). If you do not agree, you must not use the Platform.
        </p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">1. Nature of the Platform</h2>
        <p>Gavel is a digital auction marketplace where:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Sellers list items for auction</li>
          <li>Users bid using platform tokens</li>
          <li>Winning bidders complete payment via third-party payment processors</li>
        </ul>
        <p>
          Gavel acts solely as a marketplace facilitator. We are not the owner, manufacturer, or
          distributor of items listed, unless explicitly stated.
        </p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">2. Eligibility</h2>
        <p>To use Gavel, you must:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Be at least 18 years old</li>
          <li>Have legal capacity to enter into binding agreements</li>
          <li>Provide accurate registration information</li>
          <li>Maintain account security</li>
        </ul>
        <p>You are responsible for all activity under your account.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">3. Account Registration</h2>
        <p>You agree to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide truthful and complete information</li>
          <li>Keep login credentials confidential</li>
          <li>Notify us immediately of unauthorized access</li>
        </ul>
        <p>We reserve the right to suspend or terminate accounts that:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide false information</li>
          <li>Engage in fraudulent behavior</li>
          <li>Manipulate auctions</li>
          <li>Abuse token systems</li>
        </ul>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">4. Token System</h2>

        <h3 className="text-lg font-semibold">4.1 Nature of Tokens</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Tokens are digital credits used to place bids.</li>
          <li>Tokens have no cash value.</li>
          <li>Tokens are non-transferable.</li>
          <li>Tokens cannot be withdrawn or redeemed for cash.</li>
        </ul>

        <h3 className="text-lg font-semibold">4.2 Token Purchases</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>All token purchases are final.</li>
          <li>No refunds will be issued except where required by law.</li>
          <li>Payment processing is handled by third-party providers (e.g., Paystack).</li>
          <li>We are not responsible for payment processor failures.</li>
        </ul>

        <h3 className="text-lg font-semibold">4.3 Token Deduction</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Tokens are deducted per successful bid placement.</li>
          <li>Token deduction does not guarantee winning an auction.</li>
          <li>Bid tokens are non-refundable, including when you do not win, miss payment, or an auction closes below reserve.</li>
        </ul>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">5. Auctions</h2>

        <h3 className="text-lg font-semibold">5.1 Binding Nature of Bids</h3>
        <p>By placing a bid, you:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Enter into a legally binding obligation</li>
          <li>Agree to pay if you win</li>
        </ul>
        <p>Failure to complete payment may result in:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account suspension</li>
          <li>Permanent banning</li>
          <li>Forfeiture of tokens</li>
          <li>Legal action</li>
        </ul>

        <h3 className="text-lg font-semibold">5.2 Auction Integrity</h3>
        <p>We reserve the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Cancel auctions due to technical errors</li>
          <li>Reverse fraudulent bids</li>
          <li>Disqualify suspicious accounts</li>
          <li>Correct pricing errors</li>
        </ul>
        <p>
          Anti-sniping may extend the end time when valid bids are placed in the final seconds.
        </p>
        <p>All platform decisions are final.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">6. Winner Payment and Fallback</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>The current winner has one (1) hour to complete payment after being assigned payment rights.</li>
          <li>If the current winner does not pay in time, payment rights move to the next highest eligible bidder above reserve price.</li>
          <li>This fallback process may continue to second, third, or later ranked eligible bidders while reserve conditions are met.</li>
          <li>If no remaining bidder is at or above reserve price, the auction closes unsold.</li>
          <li>Failure to pay within the allowed window may result in forfeiture of purchase rights and account penalties.</li>
          <li>Gavel may relist unpaid or unsold items.</li>
          <li>Gavel is not liable for disputes between buyers and sellers after payment.</li>
        </ul>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">7. Shipping and Delivery</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Sellers are responsible for shipping items.</li>
          <li>Gavel does not guarantee shipping timelines.</li>
          <li>Delivery issues must be resolved between buyer and seller.</li>
        </ul>
        <p>We are not liable for:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Lost packages</li>
          <li>Damaged items</li>
          <li>Delayed shipping</li>
          <li>Incorrect addresses provided by users</li>
        </ul>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">8. User Conduct</h2>
        <p>You agree NOT to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use bots or automated bidding tools</li>
          <li>Manipulate auctions</li>
          <li>Create multiple accounts for abuse</li>
          <li>Reverse-engineer platform systems</li>
          <li>Attempt fraud or chargeback abuse</li>
        </ul>
        <p>Violation may result in immediate termination without refund.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">9. Platform Availability</h2>
        <p>We do not guarantee:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Continuous uptime</li>
          <li>Error-free operation</li>
          <li>Immediate transaction processing</li>
        </ul>
        <p>We may suspend or modify services at any time without prior notice.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">10. Third-Party Services</h2>
        <p>We rely on:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Payment processors</li>
          <li>Hosting providers</li>
          <li>Authentication providers</li>
        </ul>
        <p>We are not responsible for outages, errors, or failures caused by third parties.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">11. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, Gavel shall not be liable for:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Indirect damages</li>
          <li>Lost profits</li>
          <li>Loss of data</li>
          <li>Auction losses</li>
          <li>Missed bidding opportunities</li>
          <li>Emotional distress related to auction results</li>
          <li>Shipping disputes</li>
          <li>Seller misconduct</li>
        </ul>
        <p>Our total liability shall not exceed the amount paid by you in the last 30 days.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">12. Disclaimer of Warranties</h2>
        <p>The Platform is provided &quot;AS IS&quot; and &quot;AS AVAILABLE.&quot;</p>
        <p>We make no warranties regarding:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Merchantability</li>
          <li>Fitness for a particular purpose</li>
          <li>Accuracy of listings</li>
          <li>Reliability of sellers</li>
          <li>Authenticity of products</li>
        </ul>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">13. Fraud and Abuse</h2>
        <p>We reserve the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Freeze accounts under investigation</li>
          <li>Reverse suspicious transactions</li>
          <li>Share information with authorities</li>
          <li>Withhold funds pending review</li>
        </ul>
        <p>Fraudulent chargebacks will result in permanent bans.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">14. Intellectual Property</h2>
        <p>All platform content, branding, and systems are the property of Gavel.</p>
        <p>You may not:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Copy</li>
          <li>Reproduce</li>
          <li>Modify</li>
          <li>Distribute</li>
          <li>Reverse engineer</li>
        </ul>
        <p>Without written permission.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">15. Termination</h2>
        <p>We may suspend or terminate accounts:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>For Terms violations</li>
          <li>For suspected fraud</li>
          <li>For abusive behavior</li>
          <li>For unpaid auction obligations</li>
        </ul>
        <p>Termination may result in permanent loss of tokens and account data.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">16. Governing Law</h2>
        <p>These Terms shall be governed by the applicable laws in the jurisdiction where Gavel operates.</p>
        <p>Any disputes will be handled by competent courts in that jurisdiction, unless applicable law requires otherwise.</p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">17. Amendments</h2>
        <p>
          We may update these Terms at any time. Continued use of the Platform constitutes
          acceptance of updated Terms.
        </p>
      </section>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold">18. Contact Information</h2>
        <p>For questions regarding these Terms:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Email: support@gavelgh.com</li>
          <li>Platform: Gavel</li>
        </ul>
      </section>
    </main>
  )
}
