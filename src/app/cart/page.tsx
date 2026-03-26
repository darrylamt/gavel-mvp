'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Trash2, ShoppingCart, Tag, ChevronRight, Truck, PackageOpen, Package, Loader2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { supabase } from '@/lib/supabaseClient'
import { useTopToast } from '@/components/ui/TopToastProvider'
import type { DeliveryOption } from '@/app/api/delivery/estimate-checkout/route'

const PRIORITY_ICONS = {
  economy: Package,
  standard: Truck,
  cargo: PackageOpen,
} as const

export default function CartPage() {
  const { items, subtotal, removeFromCart, clearCart, incrementItem, decrementItem } = useCart()
  const { notify } = useTopToast()

  // Delivery form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('Greater Accra')
  const [notes, setNotes] = useState('')

  // Delivery estimate
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[] | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<string>('standard')
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const estimateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Discount
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | null>(null)
  const [discountPercent, setDiscountPercent] = useState<number | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)

  // Checkout
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const total = Math.max(0, subtotal - discountAmount + deliveryFee)

  // Pre-fill from profile
  useEffect(() => {
    const loadDefaults = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, phone, address')
        .eq('id', auth.user.id)
        .maybeSingle()
      const p = profile as { username?: string | null; phone?: string | null; address?: string | null } | null
      if (p?.username) setFullName((prev) => prev || p.username || '')
      if (p?.phone) setPhone((prev) => prev || p.phone || '')
      if (p?.address) setAddress((prev) => prev || p.address || '')
    }
    loadDefaults()
  }, [])

  const runEstimate = async (currentAddress: string, currentCity: string) => {
    if (!currentAddress.trim() || !currentCity.trim() || items.length === 0) {
      setDeliveryOptions(null)
      setDeliveryFee(0)
      return
    }
    setEstimateLoading(true)
    try {
      const res = await fetch('/api/delivery/estimate-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
          dropoff_address: currentAddress.trim(),
          dropoff_city: currentCity.trim(),
          dropoff_region: region.trim(),
        }),
      })
      const data = await res.json()
      const opts = data.options as DeliveryOption[] | undefined
      if (opts && opts.length > 0) {
        setDeliveryOptions(opts)
        const def = opts.find((o) => o.priority === 'standard') ?? opts[0]
        setSelectedPriority(def.priority)
        setDeliveryFee(def.price)
      } else {
        setDeliveryOptions(null)
        setDeliveryFee(0)
      }
    } catch {
      setDeliveryOptions(null)
      setDeliveryFee(0)
    } finally {
      setEstimateLoading(false)
    }
  }

  const scheduleEstimate = (newAddress: string, newCity: string) => {
    if (estimateTimerRef.current) clearTimeout(estimateTimerRef.current)
    estimateTimerRef.current = setTimeout(() => runEstimate(newAddress, newCity), 800)
  }

  const handleAddressChange = (val: string) => {
    setAddress(val)
    setDeliveryOptions(null)
    setDeliveryFee(0)
    scheduleEstimate(val, city)
  }

  const handleCityChange = (val: string) => {
    setCity(val)
    setDeliveryOptions(null)
    setDeliveryFee(0)
    scheduleEstimate(address, val)
  }

  const selectOption = (option: DeliveryOption) => {
    setSelectedPriority(option.priority)
    setDeliveryFee(option.price)
  }

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
      if (!auth.user?.email) {
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
            region: region.trim(),
            notes: notes.trim(),
          },
          delivery_meta: {
            fee: deliveryFee,
            priority: selectedPriority,
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

  // Reset discount when cart items change
  useEffect(() => {
    setAppliedDiscountCode(null)
    setDiscountPercent(null)
    setDiscountAmount(0)
    setDiscountError(null)
  }, [items])

  const inputCls =
    'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all'

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
              <p className="text-xs text-gray-400">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </p>
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
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
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

                  <div className="flex items-center justify-between gap-3 md:contents">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5">
                      <button onClick={() => decrementItem(item.lineId)} className="h-5 w-5 flex items-center justify-center text-gray-600 hover:text-black font-bold text-base leading-none" aria-label="Decrease">−</button>
                      <span className="min-w-[1.5rem] text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => incrementItem(item.lineId)} disabled={item.quantity >= item.availableStock} className="h-5 w-5 flex items-center justify-center text-gray-600 hover:text-black disabled:cursor-not-allowed disabled:text-gray-300 font-bold text-base leading-none" aria-label="Increase">+</button>
                    </div>
                    <p className="text-sm font-bold text-gray-900">GH₵ {(item.price * item.quantity).toLocaleString()}</p>
                    <button onClick={() => removeFromCart(item.lineId)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors" aria-label={`Remove ${item.title}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="h-fit space-y-4">
            {/* Delivery details */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 sm:p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Delivery Details</h2>
              <div className="space-y-2.5">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Full name" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="Phone number" type="tel" />
                <textarea value={address} onChange={(e) => handleAddressChange(e.target.value)} rows={2} className={inputCls} placeholder="Street address / landmark" />
                <input value={city} onChange={(e) => handleCityChange(e.target.value)} className={inputCls} placeholder="City / Area (e.g. East Legon, Accra)" />
                <input value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls} placeholder="Region (e.g. Greater Accra)" />
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Order notes (optional)" />
              </div>
            </div>

            {/* Delivery options — shown only when estimate succeeds */}
            {(estimateLoading || deliveryOptions) && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <h2 className="text-sm font-bold text-gray-900">Delivery Option</h2>
                </div>

                {estimateLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    <span className="text-xs text-gray-500">Calculating delivery fee…</span>
                  </div>
                ) : deliveryOptions ? (
                  <div className="space-y-2">
                    {deliveryOptions.map((option) => {
                      const Icon = PRIORITY_ICONS[option.priority]
                      const selected = selectedPriority === option.priority
                      return (
                        <button
                          key={option.priority}
                          type="button"
                          onClick={() => selectOption(option)}
                          className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                            selected
                              ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-orange-100' : 'bg-gray-100'}`}>
                            <Icon className={`h-4 w-4 ${selected ? 'text-orange-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${selected ? 'text-orange-900' : 'text-gray-900'}`}>
                              {option.label}
                            </p>
                            <p className="text-xs text-gray-500">{option.description} · {option.duration_label}</p>
                          </div>
                          <p className={`text-sm font-bold flex-shrink-0 ${selected ? 'text-orange-700' : 'text-gray-700'}`}>
                            GH₵ {option.price.toLocaleString()}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )}

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
                <p className="mt-2 text-xs font-semibold text-green-700">✓ {appliedDiscountCode} applied ({discountPercent}% off)</p>
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
                {deliveryFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Delivery
                      {deliveryOptions && <span className="ml-1 text-gray-400 text-xs capitalize">({selectedPriority})</span>}
                    </span>
                    <span className="font-semibold text-gray-900">GH₵ {deliveryFee.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-xl font-extrabold text-gray-900">GH₵ {total.toLocaleString()}</span>
              </div>

              {deliveryFee > 0 && (
                <p className="mt-1.5 text-[11px] text-gray-400 text-right">
                  Includes GH₵ {deliveryFee.toLocaleString()} delivery fee
                </p>
              )}

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
                    Pay GH₵ {total.toLocaleString()}
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
              {deliveryFee > 0 && (
                <p className="text-[10px] text-gray-400">incl. delivery</p>
              )}
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
