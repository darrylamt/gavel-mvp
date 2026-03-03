import { transitionPurchaseState } from '../purchaseState'

describe('transitionPurchaseState', () => {
  it('moves idle -> pending -> success', () => {
    const pending = transitionPurchaseState('idle', 'start')
    const success = transitionPurchaseState(pending, 'resolve')
    expect(pending).toBe('pending')
    expect(success).toBe('success')
  })

  it('moves pending -> failed on reject', () => {
    expect(transitionPurchaseState('pending', 'reject')).toBe('failed')
  })

  it('resets to idle', () => {
    expect(transitionPurchaseState('failed', 'reset')).toBe('idle')
  })
})
