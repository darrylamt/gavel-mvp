export default function WinnerPanel({
  hasEnded,
  isWinner,
  paid,
  onPay,
}: Props) {
  if (!hasEnded || !isWinner) return null

  return (
    <div className="mt-6 p-5 rounded-xl border bg-gradient-to-br from-green-50 to-white">
      <p className="font-semibold text-green-700 text-lg">
        🎉 You won this auction
      </p>

      {paid ? (
        <p className="mt-2 text-sm text-green-600">
          ✅ Payment received. Seller will contact you.
        </p>
      ) : (
        <button
          onClick={onPay}
          className="mt-4 w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition"
        >
          Pay Now
        </button>
      )}
    </div>
  )
}
