// Mock server-only so it doesn't throw in Jest (used in auctionPaymentCandidate.ts)
jest.mock('server-only', () => ({}))

// Silence expected console.error noise from React and Next.js internals in tests
const originalError = console.error.bind(console.error)
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('ReactDOM.render'))
    )
      return
    originalError(...args)
  })
})
afterAll(() => {
  jest.restoreAllMocks()
})
