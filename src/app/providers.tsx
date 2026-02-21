'use client'

import { TopToastProvider } from '@/components/ui/TopToastProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return <TopToastProvider>{children}</TopToastProvider>
}
