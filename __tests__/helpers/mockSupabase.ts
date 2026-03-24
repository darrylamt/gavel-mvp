/**
 * Creates a chainable Supabase mock that can be passed to route handlers.
 * Each query method returns `this` so chains like `.from().select().eq()` work.
 * Override terminal methods (single, maybeSingle) per test to control return values.
 */
export function createMockChain(terminalData: unknown = null, terminalError: unknown = null) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: terminalData, error: terminalError }),
    maybeSingle: jest.fn().mockResolvedValue({ data: terminalData, error: terminalError }),
  }
  // Make the chain itself awaitable (for `.insert([...])` without terminal)
  const promise = Promise.resolve({ data: terminalData, error: terminalError })
  Object.assign(chain, {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  })
  return chain
}

export function createMockSupabase(defaultData: unknown = null, defaultError: unknown = null) {
  const chain = createMockChain(defaultData, defaultError)
  const client = {
    from: jest.fn(() => chain),
    rpc: jest.fn().mockResolvedValue({ data: defaultData, error: defaultError }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-test-123', email: 'test@example.com' } },
        error: null,
      }),
    },
    // expose internals for per-test override
    _chain: chain,
  }
  return client
}

/** Build a mock Supabase user object */
export function mockUser(overrides: Partial<{ id: string; email: string; role: string }> = {}) {
  return {
    id: 'user-test-123',
    email: 'test@example.com',
    role: 'authenticated',
    ...overrides,
  }
}
