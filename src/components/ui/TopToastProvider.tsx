'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'

type ToastVariant = 'info' | 'success' | 'warning' | 'error'

type ToastInput = {
  title?: string
  description: string
  variant?: ToastVariant
  durationMs?: number
}

type Toast = {
  id: string
  title: string
  description: string
  variant: ToastVariant
}

type ToastContextValue = {
  notify: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantStyles: Record<ToastVariant, { glow: string; iconBg: string; iconColor: string }> = {
  info: {
    glow: 'shadow-cyan-100/70',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
  },
  success: {
    glow: 'shadow-emerald-100/70',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  warning: {
    glow: 'shadow-amber-100/70',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  error: {
    glow: 'shadow-rose-100/70',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
}

function ToastVariantIcon({ variant, className }: { variant: ToastVariant; className?: string }) {
  if (variant === 'success') return <CheckCircle2 className={className} />
  if (variant === 'warning') return <TriangleAlert className={className} />
  if (variant === 'error') return <XCircle className={className} />
  return <Info className={className} />
}

export function TopToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idCounterRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    ({ title, description, variant = 'info', durationMs = 2200 }: ToastInput) => {
      const id = `toast-${Date.now()}-${idCounterRef.current++}`
      const nextToast: Toast = {
        id,
        title: title || (variant === 'success' ? 'Success' : variant === 'warning' ? 'Notice' : variant === 'error' ? 'Error' : 'Update'),
        description,
        variant,
      }

      setToasts((previous) => [...previous, nextToast])

      window.setTimeout(() => {
        dismiss(id)
      }, durationMs)
    },
    [dismiss]
  )

  useEffect(() => {
    const nativeAlert = window.alert

    window.alert = (message?: unknown) => {
      notify({
        title: 'Notice',
        description: String(message ?? ''),
        variant: 'info',
      })
    }

    return () => {
      window.alert = nativeAlert
    }
  }, [notify])

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-4">
        <div className="flex w-full max-w-md flex-col gap-3">
          {toasts.map((toast) => {
            const styles = variantStyles[toast.variant]
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/70 bg-white px-3 py-3 shadow-lg ${styles.glow}`}
              >
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
                  <ToastVariantIcon variant={toast.variant} className={`h-4 w-4 ${styles.iconColor}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold leading-5 text-gray-900">{toast.title}</p>
                  <p className="mt-1 text-sm leading-5 text-gray-600">{toast.description}</p>
                </div>

                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(toast.id)}
                  className="rounded-md p-1 text-gray-300 transition hover:bg-gray-100 hover:text-gray-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useTopToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useTopToast must be used within TopToastProvider')
  }
  return context
}
