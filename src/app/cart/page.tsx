'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Trash2, ShoppingCart, Tag, ChevronRight } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { supabase } from '@/lib/supabaseClient'
import { useTopToast } from '@/components/ui/TopToastProvider'

export default function CartPage() {
  const { items, subtotal, removeFromCart, clearCart, incrementItem, decrementItem } = useCart()
  const { notify } = useTopToast()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | null>(null)
  const [discountPercent, setDiscountPercent] = useState<number | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const total = Math.max(0, subtotal - discountAmount)

  useEffect(() => {
    const loadDefaults = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      setUserId(auth.user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, phone, address')
        .eq('id', auth.user.id)
        .maybeSingle()
      const profileRow = (profile as {
        username?: string | null
        phone?: string | null
        address?: string | null
      } | null) ?? null
      if (profileRow?.username) setFullName((prev) => prev || profileRow.username || '')
      if (profileRow?.phone) setPhone((prev) => prev || profileRow.phone || '')
      if (profileRow?.address) setAddress((prev) => prev || profileRow.address || '')
    }
    loadDefaults()
  }, [])

  const handleCheckout = async () => {
    if (items.length === 0 || isCheckingOut) return
    setCheckoutError(null)
    if (!fullName.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      setCheckoutError('Please complete your delivery details before checkout.')
      return
    }
    setIsCheckingOut(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user || !auth.user.email) {
        setCheckoutError('Please sign in to continue checkout.')
        setIsCheckingOut(false)
        return
      }
      const res = await fetch('/api/shop-payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: auth.user.id,
          email: auth.user.email,
          discount_code: appliedDiscountCode || undefined,
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
        notify({ title: 'Checkout Failed', description: data.error || 'Failed to start checkout', variant: 'error' })
        setIsCheckingOut(false)
        return
      }
      window.location.href = data.authorization_url
    } catch {
      notify({ title: 'Checkout Error', description: 'Failed to start checkout. Please try again.', variant: 'error' })
      setIsCheckingOut(false)
    }
  }

  const handleApplyDiscount = async () => {
    const code = discountCode.trim().toUpperCase()
    if (!code) {
      setAppliedDiscountCode(null)
      setDiscountPercent(null)
      setDiscountAmount(0)
      setDiscountError(null)
      return
    }
    setDiscountLoading(true)
    setDiscountError(null)
    try {
      const res = await fetch('/api/shop-payments/discount-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_code: code,
          items: items.map((item) => ({
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            quantity: item.quantity,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAppliedDiscountCode(null)
        setDiscountPercent(null)
        setDiscountAmount(0)
        setDiscountError(data.error || 'Invalid discount code')
        return
      }
      setAppliedDiscountCode(String(data.code || code))
      setDiscountPercent(Number(data.percent_off || 0))
      setDiscountAmount(Number(data.discount_amount || 0))
      setDiscountError(null)
    } catch {
      setAppliedDiscountCode(null)
      setDiscountPercent(null)
      setDiscountAmount(0)
      setDiscountError('Unable to validate discount code right now.')
    } finally {
      setDiscountLoading(false)
    }
  }

  useEffect(() => {
    setAppliedDiscountCode(null)
    setDiscountPercent(null)
    setDiscountAmount(0)
    setDiscountError(null)
  }, [items])

  const inputCls = 'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all'

  return (
    <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 sm:py-10 pb-28 lg:pb-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
            <ShoppingCart className="h-4.5 w-4.5 text-gray-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cart</h1>
            {items.length > 0 && (
              <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <ShoppingCart className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-700">Your cart is empty</p>
          <p className="mt-1 text-sm text-gray-400">Add products from the shop to get started.</p>
          <Link
            href="/shop"
            className="mt-4 rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black transition-colors"
          >
            Browse Shop
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* Cart items */}
          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="hidden grid-cols-[1.5fr_1fr_0.8fr_auto] gap-4 border-b border-gray-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 md:grid">
              <span>Product</span>
              <span>Qty</span>
              <span>Total</span>
              <span />
            </div>

            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <div
                  key={item.lineId}
                  className="flex flex-col gap-3 p-4 sm:p-5 md:grid md:grid-cols-[1.5fr_1fr_0.8fr_auto] md:items-center"
                >
                  {/* Product info */}
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No image</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{item.title}</p>
                      {item.variantLabel && <p className="mt-0.5 text-xs text-gray-500">{item.variantLabel}</p>}
                      <p className="mt-0.5 text-xs text-gray-400">GH₵ {item.price.toLocaleString()} each</p>
                    </div>
                  </div>

                  {/* Qty + total + remove (mobile: row) */}
                  <div className="flex items-center justify-between gap-3 md:contents">
                    {/* Qty stepper */}
                    <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5">
                      <button
                        onClick={() => decrementItem(item.lineId)}
                        className="h-5 w-5 flex items-center justify-center text-gray-600 hover:text-black font-bold text-base leading-none"
                        aria-label={`Decrease quantity for ${item.title}`}
                      >
                        −
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => incrementItem(item.lineId)}
                        disabled={item.quantity >= item.availableStock}
                        className="h-5 w-5 flex items-center justify-center text-gray-600 hover:text-black disabled:cursor-not-allowed disabled:text-gray-300 font-bold text-base leading-none"
                        aria-label={`Increase quantity for ${item.title}`}
                      >
                        +
                      </button>
                    </div>

                    {/* Line total */}
                    <p className="text-sm font-bold text-gray-900">
                      GH₵ {(item.price * item.quantity).toLocaleString()}
                    </p>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.lineId)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Order summary sidebar */}
          <aside className="h-fit space-y-4">
            {/* Delivery details */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 sm:p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Delivery Details</h2>
              <div className="space-y-2.5">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Full name" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="Phone number" type="tel" />
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputCls} placeholder="Delivery address" />
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="City / Area" />
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Order notes (optional)" />
              </div>
            </div>

            {/* Discount code */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <h2 className="text-sm font-bold text-gray-900">Discount Code</h2>
              </div>
              <div className="flex gap-2">
                <input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  className={`${inputCls} font-mono tracking-wider`}
                  placeholder="e.g. SAVE20"
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  disabled={discountLoading}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {discountLoading ? 'Checking…' : 'Apply'}
                </button>
              </div>
              {appliedDiscountCode && discountPercent ? (
                <p className="mt-2 text-xs font-semibold text-green-700">
                  ✓ {appliedDiscountCode} applied ({discountPercent}% off)
                </p>
              ) : null}
              {discountError && <p className="mt-2 text-xs text-red-600">{discountError}</p>}
            </div>

            {/* Order summary */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 sm:p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-900">GH₵ {subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-semibold text-green-700">− GH₵ {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Delivery</span>
                  <span>Calculated after order</span>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-xl font-extrabold text-gray-900">GH₵ {total.toLocaleString()}</span>
              </div>

              {checkoutError && (
                <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs font-medium text-red-700">
                  {checkoutError}
                </div>
              )}

              {/* Desktop checkout button */}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut || items.length === 0}
                className="mt-4 hidden w-full lg:flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCheckingOut ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Sticky mobile checkout bar */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white/95 backdrop-blur-sm p-4 shadow-xl lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-lg font-extrabold text-gray-900">GH₵ {total.toLocaleString()}</p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || items.length === 0}
              className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCheckingOut ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : 'Checkout'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
