'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const variantIcons: Record<ToastVariant, string> = {
  success: '\u2713',
  error: '\u2717',
  warning: '\u26A0',
  info: '\u2139',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext value={{ toast: addToast }}>
      {children}
      {/* Toast container — bottom-right desktop, top-center mobile */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-sm:bottom-auto max-sm:top-4 max-sm:right-4 max-sm:left-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in flex items-center gap-3 px-4 py-3 rounded-lg border shadow-md text-sm font-medium ${variantClasses[t.variant]}`}
          >
            <span className="text-base">{variantIcons[t.variant]}</span>
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
