type Props = {
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
}: Props) {
  if (!hasEnded || !isWinner) return null

  if (paid) {
    return (
      <div className="mt-4 p-4 border rounded bg-green-50">
        <p className="font-bold text-green-700">
          ✅ Payment received
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 border rounded bg-green-50">
      <p className="font-bold text-green-700">
        🎉 You won this auction
      </p>

      <button
        onClick={onPay}
        className="mt-3 bg-black text-white px-4 py-2"
      >
        Pay Now
      </button>
    </div>
  )
}
