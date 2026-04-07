'use client'

import { Clock, Zap } from 'lucide-react'

type Props = {
  targetAt: string | null
  phase: 'starts' | 'ends' | 'ended'
  timeLeft: string
}

type Segs = { days?: string; hours?: string; minutes?: string; seconds?: string }

function parseSegments(timeLeft: string): Segs {
  const map: Segs = {}
  for (const part of timeLeft.split(' ')) {
    if (part.endsWith('d')) map.days = part.slice(0, -1)
    else if (part.endsWith('h')) map.hours = part.slice(0, -1)
    else if (part.endsWith('m')) map.minutes = part.slice(0, -1)
    else if (part.endsWith('s')) map.seconds = part.slice(0, -1)
  }
  return map
}

export default function AuctionCountdown({ targetAt, phase, timeLeft }: Props) {
  const isEnded = phase === 'ended'
  const isStarting = phase === 'starts'
  const segs = isEnded ? null : parseSegments(timeLeft)

  const isUrgent =
    !isEnded &&
    segs != null &&
    !segs.days &&
    !segs.hours &&
    Number(segs.minutes ?? '99') < 5

  // Build the segments to display
  const display: Array<{ value: string; label: string }> = []
  if (segs) {
    if (segs.days) display.push({ value: segs.days, label: 'days' })
    if (segs.hours) display.push({ value: segs.hours, label: 'hrs' })
    if (segs.days || segs.hours) {
      display.push({ value: segs.minutes ?? '0', label: 'min' })
    } else {
      display.push({ value: segs.minutes ?? '0', label: 'min' })
      display.push({ value: segs.seconds ?? '0', label: 'sec' })
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isEnded
          ? 'border-gray-200 bg-gray-50'
          : isUrgent
          ? 'border-red-200 bg-red-50'
          : isStarting
          ? 'border-amber-200 bg-amber-50'
          : 'border-orange-100 bg-orange-50'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {isUrgent ? (
          <Zap className="h-4 w-4 text-red-500 animate-pulse" />
        ) : (
          <Clock
            className={`h-4 w-4 ${
              isEnded ? 'text-gray-400' : isStarting ? 'text-amber-600' : 'text-orange-500'
            }`}
          />
        )}
        <span
          className={`text-xs font-bold uppercase tracking-wide ${
            isEnded
              ? 'text-gray-500'
              : isUrgent
              ? 'text-red-600'
              : isStarting
              ? 'text-amber-700'
              : 'text-orange-700'
          }`}
        >
          {isEnded
            ? 'Auction Ended'
            : isStarting
            ? 'Starting In'
            : isUrgent
            ? 'Ending Soon!'
            : 'Ends In'}
        </span>
      </div>

      {display.length > 0 && (
        <div className="flex items-end gap-1.5">
          {display.map(({ value, label }) => (
            <Segment key={label} value={value} label={label} urgent={isUrgent} />
          ))}
        </div>
      )}

      {isEnded && <p className="text-sm font-semibold text-gray-500">This auction has closed</p>}

      {targetAt && !isEnded && (
        <p className="mt-2 text-[11px] text-gray-400">
          {isStarting ? 'Opens' : 'Closes'} {new Date(targetAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}

function Segment({ value, label, urgent }: { value: string; label: string; urgent: boolean }) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl px-3 py-2 min-w-[52px] ${
        urgent ? 'bg-red-100' : 'bg-white/70'
      }`}
    >
      <span
        className={`text-2xl font-black tabular-nums leading-none ${
          urgent ? 'text-red-700' : 'text-gray-900'
        }`}
      >
        {value.padStart(2, '0')}
      </span>
      <span
        className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${
          urgent ? 'text-red-500' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  )
}
