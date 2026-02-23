'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { supabase } from '@/lib/supabaseClient'

export default function CartPage() {
  const { items, subtotal, removeFromCart, clearCart, incrementItem, decrementItem } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  const total = subtotal

  const handleCheckout = async () => {
    if (items.length === 0 || isCheckingOut) return

    if (!fullName.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      alert('Please complete your delivery details before checkout.')
      return
    }

    setIsCheckingOut(true)

    try {
      const { data: auth } = await supabase.auth.getUser()

      if (!auth.user || !auth.user.email) {
        alert('Please sign in to continue checkout.')
        return
      }

      const res = await fetch('/api/shop-payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: auth.user.id,
          email: auth.user.email,
          delivery: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            city: city.trim(),
            notes: notes.trim(),
          },
          items: items.map((item) => ({
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            variant_label: item.variantLabel ?? null,
            quantity: item.quantity,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to start checkout')
        return
      }

      window.location.href = data.authorization_url
    } catch {
      alert('Failed to start checkout')
    } finally {
      setIsCheckingOut(false)
    }
  }

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
                <div key={item.lineId} className="grid grid-cols-[1fr_auto] gap-3 py-4 md:grid-cols-[1.3fr_0.8fr_0.7fr_0.3fr] md:items-center">
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
                      {item.variantLabel ? <p className="text-xs text-gray-500">{item.variantLabel}</p> : null}
                      <p className="text-xs text-gray-500">GHS {item.price.toLocaleString()} each</p>
                      <p className="text-xs text-gray-500">In stock: {item.availableStock}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 md:hidden">
                    <div className="inline-flex items-center gap-3 rounded-full border px-3 py-1 text-sm">
                      <button
                        onClick={() => decrementItem(item.lineId)}
                        className="font-bold text-gray-700 hover:text-black"
                        aria-label={`Decrease quantity for ${item.title}`}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => incrementItem(item.lineId)}
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
                      onClick={() => removeFromCart(item.lineId)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="hidden md:block">
                    <div className="inline-flex items-center gap-3 rounded-full border px-3 py-1 text-sm">
                      <button
                        onClick={() => decrementItem(item.lineId)}
                        className="font-bold text-gray-700 hover:text-black"
                        aria-label={`Decrease quantity for ${item.title}`}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => incrementItem(item.lineId)}
                        disabled={item.quantity >= item.availableStock}
                        className="font-bold text-gray-700 hover:text-black disabled:cursor-not-allowed disabled:text-gray-300"
                        aria-label={`Increase quantity for ${item.title}`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="hidden text-sm font-semibold text-gray-900 md:block">
                    GHS {(item.price * item.quantity).toLocaleString()}
                  </div>

                  <div className="hidden md:flex md:justify-end">
                    <button
                      onClick={() => removeFromCart(item.lineId)}
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

            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Delivery Details</p>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Full name"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Phone number"
              />
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Delivery address"
              />
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="City / Area"
              />
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Notes (optional)"
              />
            </div>

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

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || items.length === 0}
              className="mt-4 w-full rounded-full bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isCheckingOut ? 'Redirecting…' : 'Checkout Now'}
            </button>
          </aside>
        </div>
      )}
    </main>
  )
}
