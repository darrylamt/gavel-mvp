import { resolvePaymentProvider } from '../provider'

const platformRef = jest.requireActual('react-native').Platform

describe('resolvePaymentProvider', () => {
  afterEach(() => {
    Object.defineProperty(platformRef, 'OS', { value: 'ios' })
  })

  it('returns app_store on ios for digital goods', () => {
    Object.defineProperty(platformRef, 'OS', { value: 'ios' })
    expect(resolvePaymentProvider({ productKind: 'digital' })).toBe('app_store')
  })

  it('returns play_billing on android for digital goods', () => {
    Object.defineProperty(platformRef, 'OS', { value: 'android' })
    expect(resolvePaymentProvider({ productKind: 'digital' })).toBe('play_billing')
  })

  it('returns paystack for physical goods', () => {
    Object.defineProperty(platformRef, 'OS', { value: 'ios' })
    expect(resolvePaymentProvider({ productKind: 'physical' })).toBe('paystack')
  })
})
