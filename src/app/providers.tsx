'use client'

import { TopToastProvider } from '@/components/ui/TopToastProvider'
import NotificationPrompt from '@/components/NotificationPrompt'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TopToastProvider>
      {children}
      <NotificationPrompt />
    </TopToastProvider>
  )
}
