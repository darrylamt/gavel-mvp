type Point = {
  label: string
  value: number
}

type Props = {
  title: string
  points: Point[]
  colorClass?: string
}

export default function MiniBarChart({
  title,
  points,
  colorClass = 'bg-blue-500',
}: Props) {
  const max = Math.max(1, ...points.map((point) => point.value))

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>
      <div className="space-y-3">
        {points.map((point) => {
          const width = `${(point.value / max) * 100}%`
          return (
            <div key={point.label}>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                <span>{point.label}</span>
                <span>{point.value}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className={`h-2 rounded-full ${colorClass}`} style={{ width }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
