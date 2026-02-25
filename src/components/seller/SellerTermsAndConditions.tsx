import { useState } from 'react';

export default function SellerTermsAndConditions({ onAccept }: { onAccept: () => void }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl border border-gray-200 shadow">
      <h2 className="text-xl font-bold mb-4">Seller Terms & Conditions</h2>
      <div className="prose max-w-none mb-4 text-sm">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>Commission:</strong> Gavel charges a 10% commission on the final selling price of all products and auctions. This fee is automatically deducted from the amount paid by the buyer.
          </li>
          <li>
            <strong>Delivery Obligation:</strong> Sellers are required to deliver the product to the buyer after payment is confirmed. Failure to deliver may result in penalties or account suspension.
          </li>
          <li>
            <strong>Payment Release:</strong> Sellers will receive payment for their product only after successful delivery to the buyer is confirmed.
          </li>
          <li>
            <strong>Product Authenticity:</strong> Sellers must ensure all products listed are genuine and accurately described. Counterfeit or misrepresented items are strictly prohibited.
          </li>
          <li>
            <strong>Compliance:</strong> Sellers must comply with all applicable laws and Gavel's marketplace policies. Illegal or prohibited items are not allowed.
          </li>
          <li>
            <strong>Account Responsibility:</strong> Sellers are responsible for maintaining the security of their account and all activity that occurs under it.
          </li>
        </ol>
      </div>
      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={accepted}
          onChange={e => setAccepted(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span>I have read and accept the Seller Terms & Conditions</span>
      </label>
      <button
        className="w-full rounded bg-black text-white py-2 font-semibold disabled:opacity-50"
        disabled={!accepted}
        onClick={onAccept}
      >
        Accept
      </button>
    </div>
  );
}
