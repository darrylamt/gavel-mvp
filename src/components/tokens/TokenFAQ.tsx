export default function TokenFAQ() {
  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-xl font-bold mb-4">
        Token FAQs
      </h2>

      <div className="space-y-4 text-sm text-gray-700">
        <div>
          <p className="font-semibold">
            What are tokens used for?
          </p>
          <p>
            Tokens are required to place bids on auctions. 
            Each bid consumes tokens from your balance.
          </p>
        </div>

        <div>
          <p className="font-semibold">
            Do tokens expire?
          </p>
          <p>
            No. Tokens never expire and remain in your account 
            until you use them.
          </p>
        </div>

        <div>
          <p className="font-semibold">
            Can I get a refund for tokens?
          </p>
          <p>
            Token purchases are non-refundable once credited 
            to your account.
          </p>
        </div>

        <div>
          <p className="font-semibold">
            What happens if I run out of tokens?
          </p>
          <p>
            You won’t be able to place bids until you purchase more tokens.
          </p>
        </div>

        <div>
          <p className="font-semibold">
            Is payment secure?
          </p>
          <p>
            Yes. All payments are processed securely via Paystack.
            We never store your card details.
          </p>
        </div>
      </div>
    </section>
  )
}
