import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SHOP_ENABLED } from '@/lib/config'

/**
 * Route protection for the retired fixed-price shop (Next.js 16 "proxy"
 * convention, formerly "middleware").
 *
 * When SHOP_ENABLED is false, any direct navigation to a shop/cart/checkout
 * route is redirected to /auctions, and the seller product-management routes are
 * redirected to /seller/auctions (sellers can only create auctions now).
 *
 * When SHOP_ENABLED is true this is a no-op and the shop works exactly as before
 * — keeping the change fully reversible via the flag.
 */

// Public shop routes → redirect to /auctions
const SHOP_PATHS = ['/shop', '/cart', '/checkout', '/product', '/products']
// Seller fixed-price product routes → redirect to /seller/auctions
const SELLER_SHOP_PATHS = ['/seller/products', '/seller/shop']

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function proxy(req: NextRequest) {
  // Shop enabled → behave normally (reversible).
  if (SHOP_ENABLED) return NextResponse.next()

  const { pathname } = req.nextUrl

  if (matches(pathname, SELLER_SHOP_PATHS)) {
    return NextResponse.redirect(new URL('/seller/auctions', req.url))
  }

  if (matches(pathname, SHOP_PATHS)) {
    return NextResponse.redirect(new URL('/auctions', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/shop',
    '/shop/:path*',
    '/cart',
    '/cart/:path*',
    '/checkout',
    '/checkout/:path*',
    '/product/:path*',
    '/products',
    '/products/:path*',
    '/seller/products',
    '/seller/products/:path*',
    '/seller/shop',
    '/seller/shop/:path*',
  ],
}
