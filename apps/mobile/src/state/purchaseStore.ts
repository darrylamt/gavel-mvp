import { create } from 'zustand'
import type { PurchaseState } from '@/src/lib/payments/purchaseState'

type PurchaseStore = {
  status: PurchaseState
  lastMessage?: string
  setStatus: (status: PurchaseState, message?: string) => void
}

export const usePurchaseStore = create<PurchaseStore>((set) => ({
  status: 'idle',
  lastMessage: undefined,
  setStatus: (status, message) => set({ status, lastMessage: message }),
}))
