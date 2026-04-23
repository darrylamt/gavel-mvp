import { useState } from 'react';

export default function SellerTermsAndConditions({ onAccept }: { onAccept: () => void }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl border border-gray-200 shadow">
      <h2 className="text-xl font-bold mb-1">Seller Terms & Conditions</h2>
      <p className="text-xs text-gray-500 mb-4">Please read through the application process and terms before submitting.</p>

      {/* Application Flow */}
      <div className="mb-5 rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">How the application process works</p>
        <ol className="space-y-2.5">
          {[
            { step: '1', title: 'Submit your application', desc: 'Fill in your business details and upload your Ghana Card for identity verification.' },
            { step: '2', title: 'We review it (2–5 business days)', desc: 'Our team verifies your identity and business information. You\'ll receive an SMS update when a decision is made.' },
            { step: '3', title: 'Approval & shop creation', desc: 'If approved, your seller account and shop are activated automatically. You can start listing products right away.' },
            { step: '4', title: 'Rejected? You can reapply', desc: 'If your application is not approved, you\'ll receive a reason and can submit a new application after addressing the issue.' },
            { step: '5', title: 'Multiple shops supported', desc: 'Once approved, you can apply again to create additional shops under the same account.' },
          ].map(({ step, title, desc }) => (
            <li key={step} className="flex gap-3">
              <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-[10px] font-black mt-0.5">{step}</span>
              <div>
                <p className="text-xs font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Terms */}
      <div className="prose max-w-none mb-4 text-sm">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>Commission:</strong> Gavel charges a 10% commission on the final selling price of all products and auctions. This fee is automatically deducted from the buyer's payment before your payout is released.
          </li>
          <li>
            <strong>Delivery Obligation:</strong> Sellers must arrange delivery of sold products within the agreed timeframe after payment is confirmed. Failure to deliver may result in order cancellation, penalties, or account suspension.
          </li>
          <li>
            <strong>Payment Release:</strong> Payouts are held until the buyer confirms delivery or the confirmation window expires. Payment is released to your registered payout account after this point.
          </li>
          <li>
            <strong>Product Authenticity:</strong> All listings must be genuine and accurately described. Counterfeit, stolen, or misrepresented items are strictly prohibited and will result in immediate suspension.
          </li>
          <li>
            <strong>Identity Verification:</strong> Your Ghana Card is used solely for identity verification and fraud prevention. It is stored securely and is not shared publicly.
          </li>
          <li>
            <strong>Compliance:</strong> You must comply with all applicable Ghanaian laws and Gavel's marketplace policies. Illegal, hazardous, or prohibited items are not allowed.
          </li>
          <li>
            <strong>Account Responsibility:</strong> You are responsible for all activity under your seller account. Keep your login credentials secure and notify Gavel immediately if you suspect unauthorised access.
          </li>
          <li>
            <strong>Multiple Shops:</strong> You may operate more than one shop under a single account, subject to approval of each application. Each shop is treated independently for listings and payouts.
          </li>
        </ol>
      </div>

      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={e => setAccepted(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 accent-orange-500"
        />
        <span className="text-sm">I have read and accept the Seller Terms & Conditions</span>
      </label>
      <button
        className="w-full rounded-lg bg-black text-white py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-gray-800 transition-colors"
        disabled={!accepted}
        onClick={onAccept}
      >
        Accept & Continue
      </button>
    </div>
  );
}
