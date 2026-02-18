'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const CART_ITEMS_KEY = 'gavel:cart-items'
const CART_ITEMS_EVENT = 'gavel:cart-items-changed'

export type CartItem = {
  productId: string
  title: string
  price: number
  imageUrl: string | null
  quantity: number
  availableStock: number
}

type AddToCartInput = {
  productId: string
  title: string
  price: number
  imageUrl: string | null
  availableStock: number
}

function readCartItems(): CartItem[] {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(CART_ITEMS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is CartItem => {
      return (
        typeof item?.productId === 'string' &&
        typeof item?.title === 'string' &&
        typeof item?.price === 'number' &&
        typeof item?.quantity === 'number' &&
        typeof item?.availableStock === 'number'
      )
    })
  } catch {
    return []
  }
}

function writeCartItems(items: CartItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(CART_ITEMS_EVENT))
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const sync = () => setItems(readCartItems())

    sync()
    window.addEventListener('storage', sync)
    window.addEventListener(CART_ITEMS_EVENT, sync)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(CART_ITEMS_EVENT, sync)
    }
  }, [])

  const addToCart = useCallback((input: AddToCartInput) => {
    const safeStock = Math.max(0, Math.floor(input.availableStock))
    if (safeStock <= 0) return false

    const current = readCartItems()
    const index = current.findIndex((item) => item.productId === input.productId)

    let next: CartItem[]

    if (index >= 0) {
      next = current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              availableStock: safeStock,
              quantity: Math.min(item.quantity + 1, safeStock),
            }
          : item
      )
    } else {
      next = [
        ...current,
        {
          productId: input.productId,
          title: input.title,
          price: input.price,
          imageUrl: input.imageUrl,
          quantity: 1,
          availableStock: safeStock,
        },
      ]
    }

    writeCartItems(next)
    setItems(next)
    return true
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    const current = readCartItems()
    const next = current.filter((item) => item.productId !== productId)
    writeCartItems(next)
    setItems(next)
  }, [])

  const setItemQuantity = useCallback((productId: string, quantity: number) => {
    const current = readCartItems()

    const target = current.find((item) => item.productId === productId)
    if (!target) return

    const clampedQuantity = Math.max(0, Math.min(Math.floor(quantity), Math.max(target.availableStock, 0)))

    if (clampedQuantity <= 0) {
      const next = current.filter((item) => item.productId !== productId)
      writeCartItems(next)
      setItems(next)
      return
    }

    const next = current.map((item) =>
      item.productId === productId ? { ...item, quantity: clampedQuantity } : item
    )

    writeCartItems(next)
    setItems(next)
  }, [])

  const incrementItem = useCallback((productId: string) => {
    const current = readCartItems()
    const next = current.map((item) =>
      item.productId === productId
        ? { ...item, quantity: Math.min(item.quantity + 1, Math.max(item.availableStock, 0)) }
        : item
    )

    writeCartItems(next)
    setItems(next)
  }, [])

  const decrementItem = useCallback((productId: string) => {
    const current = readCartItems()
    const next = current
      .map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
      )
      .filter((item) => item.quantity > 0)

    writeCartItems(next)
    setItems(next)
  }, [])

  const clearCart = useCallback(() => {
    writeCartItems([])
    setItems([])
  }, [])

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items])

  return {
    items,
    itemCount,
    subtotal,
    addToCart,
    removeFromCart,
    setItemQuantity,
    incrementItem,
    decrementItem,
    clearCart,
  }
}
