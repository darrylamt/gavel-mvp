'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const STARRED_AUCTIONS_KEY = 'gavel:starred-auctions'
const STARRED_AUCTIONS_EVENT = 'gavel:starred-auctions-changed'

function readStarredIds(): string[] {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(STARRED_AUCTIONS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const ids = parsed.filter((value): value is string => typeof value === 'string')
    return Array.from(new Set(ids))
  } catch {
    return []
  }
}

function writeStarredIds(ids: string[]) {
  if (typeof window === 'undefined') return
  const uniqueIds = Array.from(new Set(ids))
  window.localStorage.setItem(STARRED_AUCTIONS_KEY, JSON.stringify(uniqueIds))
  window.dispatchEvent(new CustomEvent(STARRED_AUCTIONS_EVENT))
}

export function useStarredAuctions() {
  const [starredIds, setStarredIds] = useState<string[]>([])

  useEffect(() => {
    const sync = () => setStarredIds(readStarredIds())

    sync()
    window.addEventListener('storage', sync)
    window.addEventListener(STARRED_AUCTIONS_EVENT, sync)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(STARRED_AUCTIONS_EVENT, sync)
    }
  }, [])

  const toggleStarred = useCallback((auctionId: string) => {
    const ids = readStarredIds()
    const isStarred = ids.includes(auctionId)
    const nextIds = isStarred ? ids.filter((id) => id !== auctionId) : [...ids, auctionId]
    writeStarredIds(nextIds)
    setStarredIds(nextIds)
    return !isStarred
  }, [])

  const pruneStarred = useCallback((validAuctionIds: string[]) => {
    const validSet = new Set(validAuctionIds)
    const ids = readStarredIds()
    const nextIds = ids.filter((id) => validSet.has(id))

    if (nextIds.length !== ids.length) {
      writeStarredIds(nextIds)
      setStarredIds(nextIds)
    }
  }, [])

  const starredSet = useMemo(() => new Set(starredIds), [starredIds])

  return {
    starredIds,
    starredCount: starredIds.length,
    starredSet,
    isStarred: (auctionId: string) => starredSet.has(auctionId),
    toggleStarred,
    pruneStarred,
  }
}
