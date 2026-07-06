'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

interface ToastItem {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
  duration: number
}

interface ToastContextValue {
  // Simple confirmation, optionally with a manual action button.
  show: (message: string, opts?: { actionLabel?: string; onAction?: () => void; duration?: number }) => void
  // "X removed" pattern: the UI updates immediately, but the real mutation
  // (commit) doesn't fire until the toast's window passes — clicking UNDO
  // cancels it entirely instead of needing a compensating "un-delete" call.
  // onUndo is for restoring the optimistic UI change (e.g. re-inserting the
  // row you just filtered out of local state).
  showUndo: (message: string, commit: () => void, opts?: { actionLabel?: string; duration?: number; onUndo?: () => void }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // No-op fallback so a stray call outside the provider never crashes —
    // undo just commits immediately instead of silently doing nothing.
    return { show: () => {}, showUndo: (_message, commit) => commit() }
  }
  return ctx
}

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const show = useCallback((message: string, opts?: { actionLabel?: string; onAction?: () => void; duration?: number }) => {
    const id = nextId++
    const duration = opts?.duration ?? 3200
    setToasts(t => [...t.slice(-1), { id, message, actionLabel: opts?.actionLabel, onAction: opts?.onAction, duration }])
    timers.current.set(id, setTimeout(() => dismiss(id), duration))
  }, [dismiss])

  const showUndo = useCallback((message: string, commit: () => void, opts?: { actionLabel?: string; duration?: number; onUndo?: () => void }) => {
    const duration = opts?.duration ?? 4500
    const id = nextId++
    let committed = false
    setToasts(t => [...t.slice(-1), {
      id, message, duration,
      actionLabel: opts?.actionLabel ?? 'UNDO',
      onAction: () => { committed = true; opts?.onUndo?.() },
    }])
    timers.current.set(id, setTimeout(() => {
      if (!committed) commit()
      dismiss(id)
    }, duration))
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ show, showUndo }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 'calc(70px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          zIndex: 9500, pointerEvents: 'none', padding: '0 1rem',
        }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface)', border: '1px solid var(--amber-dim)',
            borderRadius: 4, padding: '0.65rem 1rem', maxWidth: 420, width: '100%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cream)', letterSpacing: 0.3 }}>
              {t.message}
            </span>
            {t.actionLabel && (
              <button
                onClick={() => { t.onAction?.(); dismiss(t.id) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 11,
                  fontWeight: 700, letterSpacing: 1, padding: 4, flexShrink: 0,
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
