import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import "../styles/Toast.css"

type ToastKind = "info" | "success" | "error"

export type ToastInput = {
  message: string
  kind?: ToastKind
  durationMs?: number
}

type Toast = ToastInput & { id: string }

type ToastCtx = {
  push: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

let enqueueRef: ((toast: ToastInput) => void) | null = null

function useToastQueue() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (input: ToastInput) => {
      const toast: Toast = {
        id: (globalThis.crypto && "randomUUID" in globalThis.crypto)
          ? (globalThis.crypto as Crypto).randomUUID()
          : Math.random().toString(36).slice(2),
        kind: input.kind ?? "info",
        durationMs: input.durationMs ?? 3200,
        message: input.message,
      }
      setToasts(prev => [...prev, toast])
      const timer = window.setTimeout(() => remove(toast.id), toast.durationMs)
      timers.current.set(toast.id, timer)
    },
    [remove]
  )

  useEffect(() => {
    return () => {
      timers.current.forEach(id => window.clearTimeout(id))
      timers.current.clear()
    }
  }, [])

  return { toasts, push, remove }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, push, remove } = useToastQueue()

  useEffect(() => {
    enqueueRef = push
    return () => {
      enqueueRef = null
    }
  }, [push])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.kind}`} role="status">
            <span>{t.message}</span>
            <button className="toast-close" aria-label="Dismiss notification" onClick={() => remove(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("ToastProvider missing")
  return ctx.push
}

export function toast(toast: ToastInput) {
  enqueueRef?.(toast)
}
