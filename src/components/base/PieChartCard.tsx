'use client'

type PiePoint = {
  label: string
  value: number
}

type Props = {
  title: string
  points: PiePoint[]
  emptyLabel?: string
}

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

function formatPercent(value: number, total: number) {
  if (total <= 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

export default function PieChartCard({ title, points, emptyLabel = 'No data yet' }: Props) {
  const safePoints = points
    .map((point) => ({ label: point.label, value: Number(point.value || 0) }))
    .filter((point) => point.value > 0)

  const total = safePoints.reduce((sum, point) => sum + point.value, 0)

  let runningAngle = 0
  const segments = safePoints.map((point, index) => {
    const angle = total > 0 ? (point.value / total) * 360 : 0
    const start = runningAngle
    const end = runningAngle + angle
    runningAngle = end

    return {
      ...point,
      color: CHART_COLORS[index % CHART_COLORS.length],
      start,
      end,
    }
  })

  const gradient =
    total > 0
      ? `conic-gradient(${segments
          .map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`)
          .join(', ')})`
      : 'conic-gradient(var(--color-muted) 0deg 360deg)'

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <div className="h-full w-full rounded-full" style={{ background: gradient }} />
          <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white">
            <span className="text-sm font-semibold text-gray-700">{total}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {segments.length === 0 ? (
            <p className="text-sm text-gray-500">{emptyLabel}</p>
          ) : (
            segments.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="truncate text-gray-700">{segment.label}</span>
                </div>
                <span className="whitespace-nowrap text-gray-500">
                  {segment.value} ({formatPercent(segment.value, total)})
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
