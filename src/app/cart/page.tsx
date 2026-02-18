'use client'

import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'

export default function CartPage() {
  const { items, subtotal, removeFromCart, clearCart, incrementItem, decrementItem } = useCart()
  const total = subtotal

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Shopping Cart</h1>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Clear cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-gray-50 p-8 text-center">
          <p className="text-base font-medium text-gray-900">Your cart is empty.</p>
          <p className="mt-2 text-sm text-gray-600">Add products from the shop page.</p>
          <Link
            href="/shop"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Go to Shop
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border bg-white p-4">
            <div className="hidden grid-cols-[1.3fr_0.8fr_0.7fr_0.3fr] border-b pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
              <span>Product</span>
              <span>Quantity</span>
              <span>Total</span>
              <span className="text-right">Action</span>
            </div>

            <div className="divide-y">
              {items.map((item) => (
                <div key={item.productId} className="grid grid-cols-[1fr_auto] gap-3 py-4 md:grid-cols-[1.3fr_0.8fr_0.7fr_0.3fr] md:items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-lg bg-gray-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No image</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">GHS {item.price.toLocaleString()} each</p>
                      <p className="text-xs text-gray-500">In stock: {item.availableStock}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 md:justify-self-start md:flex-col md:items-start md:gap-3">
                    <div className="inline-flex items-center gap-3 rounded-full border px-3 py-1 text-sm">
                      <button
                        onClick={() => decrementItem(item.productId)}
                        className="font-bold text-gray-700 hover:text-black"
                        aria-label={`Decrease quantity for ${item.title}`}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => incrementItem(item.productId)}
                        disabled={item.quantity >= item.availableStock}
                        className="font-bold text-gray-700 hover:text-black disabled:cursor-not-allowed disabled:text-gray-300"
                        aria-label={`Increase quantity for ${item.title}`}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-sm font-semibold text-gray-900 md:text-left">
                      GHS {(item.price * item.quantity).toLocaleString()}
                    </div>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </section>

          <aside className="h-fit rounded-2xl border bg-white p-4">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Sub Total</span>
                <span className="font-medium">GHS {subtotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-extrabold">GHS {total.toLocaleString()}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">90 day limited warranty against manufacturer defects.</p>

            <button className="mt-4 w-full rounded-full bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800">
              Checkout Now
            </button>
          </aside>
        </div>
      )}
    </main>
  )
}
