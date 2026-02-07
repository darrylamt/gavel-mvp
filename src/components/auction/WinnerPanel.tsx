type WinnerPanelProps = {
  hasEnded: boolean
  isWinner: boolean
  paid: boolean
  onPay: () => void
}

export default function WinnerPanel({
  hasEnded,
  isWinner,
  paid,
  onPay,
}: WinnerPanelProps) {
  if (!hasEnded || !isWinner) return null

  if (paid) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-50">
        <p className="font-semibold text-green-700">
          ✅ Payment received
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 border rounded-lg bg-green-50">
      <p className="font-semibold text-green-700">
        🎉 You won this auction
      </p>

      <button
        onClick={onPay}
        className="mt-3 w-full bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
      >
        Pay Now
      </button>
    </div>
  )
}
