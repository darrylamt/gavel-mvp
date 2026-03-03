export type PurchaseState = 'idle' | 'pending' | 'success' | 'failed'

export function transitionPurchaseState(
  current: PurchaseState,
  event: 'start' | 'resolve' | 'reject' | 'reset'
): PurchaseState {
  if (event === 'reset') return 'idle'
  if (event === 'start') return 'pending'
  if (event === 'resolve') return current === 'pending' ? 'success' : current
  if (event === 'reject') return current === 'pending' ? 'failed' : current
  return current
}
