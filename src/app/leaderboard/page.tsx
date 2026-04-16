'use client'

import { useEffect, useState } from 'react'
import { Trophy, Medal, TrendingUp } from 'lucide-react'

type LeaderboardEntry = {
  rank: number
  display_name: string
  total_referrals: number
  earnings: number
}

type LeaderboardData = {
  tab: 'monthly' | 'all-time'
  entries: LeaderboardEntry[]
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'monthly' | 'all-time'>('monthly')
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/referrals/leaderboard?tab=${tab}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab])

  function rankIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return <span className="text-sm font-semibold text-gray-400">{rank}</span>
  }

  const currentMonthLabel = new Date().toLocaleDateString('en-GH', { month: 'long', year: 'numeric' })

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100">
          <TrendingUp className="h-7 w-7 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Referral Leaderboard</h1>
        <p className="mt-2 text-gray-500">Top earners on Gavel&apos;s referral programme</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex rounded-xl border border-gray-100 bg-gray-50 p-1">
        {(['monthly', 'all-time'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'monthly' ? `${currentMonthLabel}` : 'All Time'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="py-16 text-center">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">
              {tab === 'monthly' ? 'No referrals this month yet.' : 'No data yet.'}
            </p>
            <a href="/referrals" className="mt-3 inline-block text-sm font-medium text-orange-500 hover:text-orange-600">
              Get your referral link →
            </a>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.entries.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-4 px-5 py-4 ${entry.rank <= 3 ? 'bg-gradient-to-r from-orange-50/40 to-transparent' : ''}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  {rankIcon(entry.rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-gray-900">{entry.display_name}</p>
                  <p className="text-xs text-gray-400">{entry.total_referrals} referral{entry.total_referrals !== 1 ? 's' : ''}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-orange-600">GHS {entry.earnings.toFixed(2)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">earned</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-center text-white shadow-lg">
        <h3 className="text-lg font-bold">Want to appear here?</h3>
        <p className="mt-1 text-sm text-orange-100">Share your referral link and earn 2% on every purchase your referrals make.</p>
        <a
          href="/referrals"
          className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-50"
        >
          Get my referral link
        </a>
      </div>
    </main>
  )
}
