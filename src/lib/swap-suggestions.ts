import type { SwapInventoryItem, SwapUpgradeSuggestion } from '@/types/swap'

/**
 * Given a trade-in value and a list of active inventory items,
 * returns up to 5 labeled upgrade suggestions sorted by top-up amount ascending.
 */
export function getUpgradeSuggestions(
  tradeInValue: number,
  inventory: SwapInventoryItem[]
): SwapUpgradeSuggestion[] {
  const eligible = inventory
    .filter((item) => item.is_active && item.quantity > 0 && item.price > tradeInValue)
    .map((item) => ({ item, topUpAmount: item.price - tradeInValue }))
    .sort((a, b) => a.topUpAmount - b.topUpAmount)

  if (eligible.length === 0) return []

  const MAX = 5
  const selected = eligible.slice(0, MAX)

  const labels: SwapUpgradeSuggestion['label'][] = [
    'Budget Upgrade',
    'Popular Choice',
    'Best Upgrade',
  ]

  return selected.map((entry, index) => {
    let label: SwapUpgradeSuggestion['label']
    if (selected.length === 1) {
      label = 'Popular Choice'
    } else if (index === 0) {
      label = 'Budget Upgrade'
    } else if (index === selected.length - 1) {
      label = 'Best Upgrade'
    } else {
      label = 'Popular Choice'
    }

    return { ...entry, label }
  })
}
