import { NextRequest } from 'next/server'

/**
 * Creates a NextRequest for testing App Router handlers directly.
 */
export function makeRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  body?: unknown,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/** Creates a request with a Bearer auth token */
export function makeAuthRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  body?: unknown,
  token = 'mock-jwt-token',
  extraHeaders?: Record<string, string>
): NextRequest {
  return makeRequest(url, method, body, {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  })
}
