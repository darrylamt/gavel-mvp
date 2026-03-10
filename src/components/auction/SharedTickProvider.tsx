'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type SharedTickContextValue = {
  nowMs: number
}

const SharedTickContext = createContext<SharedTickContextValue | null>(null)

export function SharedTickProvider({ children }: { children: React.ReactNode }) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <SharedTickContext.Provider value={{ nowMs }}>
      {children}
    </SharedTickContext.Provider>
  )
}

export function useSharedTick() {
  const context = useContext(SharedTickContext)
  if (!context) {
    // Fallback for components not wrapped in provider
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [nowMs, setNowMs] = useState(() => Date.now())
    
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const interval = setInterval(() => setNowMs(Date.now()), 1000)
      return () => clearInterval(interval)
    }, [])
    
    return { nowMs }
  }
  return context
}
