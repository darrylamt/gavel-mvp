export default function TokenBalanceCard({
  tokens,
}: {
  tokens: number
}) {
  return (
    <div className="p-4 border rounded-lg bg-amber-50 mb-8">
      <p className="text-sm text-gray-600">Token Balance</p>
      <p className="text-2xl font-bold text-amber-700">
        🪙 {tokens}
      </p>
    </div>
  )
}
