export default function FAQPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">
        Frequently Asked Questions
      </h1>

      <div className="space-y-6">
        <div>
          <h2 className="font-semibold">
            What are tokens?
          </h2>
          <p className="text-gray-700">
            Tokens are used to place bids on auctions.
            Each bid consumes tokens.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            Can I get a refund for tokens?
          </h2>
          <p className="text-gray-700">
            Token purchases are non-refundable.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            What happens if I win an auction?
          </h2>
          <p className="text-gray-700">
            You’ll be prompted to complete payment.
            If payment is not completed, penalties may apply.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            Can I change my username?
          </h2>
          <p className="text-gray-700">
            Usernames are permanent once set.
          </p>
        </div>
      </div>
    </main>
  )
}
