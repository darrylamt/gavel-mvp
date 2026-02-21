'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const STARRED_PRODUCTS_KEY = 'gavel:starred-products'
const STARRED_PRODUCTS_EVENT = 'gavel:starred-products-changed'

function readStarredProductIds(): string[] {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(STARRED_PRODUCTS_KEY)
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

function writeStarredProductIds(ids: string[]) {
  if (typeof window === 'undefined') return
  const uniqueIds = Array.from(new Set(ids))
  window.localStorage.setItem(STARRED_PRODUCTS_KEY, JSON.stringify(uniqueIds))
  window.dispatchEvent(new CustomEvent(STARRED_PRODUCTS_EVENT))
}

export function useStarredProducts() {
  const [starredProductIds, setStarredProductIds] = useState<string[]>([])

  useEffect(() => {
    const sync = () => setStarredProductIds(readStarredProductIds())

    sync()
    window.addEventListener('storage', sync)
    window.addEventListener(STARRED_PRODUCTS_EVENT, sync)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(STARRED_PRODUCTS_EVENT, sync)
    }
  }, [])

  const toggleStarredProduct = useCallback((productId: string) => {
    const ids = readStarredProductIds()
    const isStarred = ids.includes(productId)
    const nextIds = isStarred ? ids.filter((id) => id !== productId) : [...ids, productId]

    writeStarredProductIds(nextIds)
    setStarredProductIds(nextIds)

    return !isStarred
  }, [])

  const pruneStarredProducts = useCallback((validProductIds: string[]) => {
    const validSet = new Set(validProductIds)
    const ids = readStarredProductIds()
    const nextIds = ids.filter((id) => validSet.has(id))

    if (nextIds.length !== ids.length) {
      writeStarredProductIds(nextIds)
      setStarredProductIds(nextIds)
    }
  }, [])

  const starredProductSet = useMemo(() => new Set(starredProductIds), [starredProductIds])

  return {
    starredProductIds,
    starredProductCount: starredProductIds.length,
    starredProductSet,
    isStarredProduct: (productId: string) => starredProductSet.has(productId),
    toggleStarredProduct,
    pruneStarredProducts,
  }
}
