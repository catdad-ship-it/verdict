'use client'
import { useEffect, useRef } from 'react'
import type { ReactNode, CSSProperties } from 'react'

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

// Reference-counted so two modals stacking (rare, but not impossible given
// this app's independent boolean modal-state flags) don't have the second
// one's cleanup re-enable body scroll while the first is still open.
let lockCount = 0
let savedOverflow = ''
function lockBodyScroll() {
  if (lockCount === 0) savedOverflow = document.body.style.overflow
  lockCount++
  document.body.style.overflow = 'hidden'
}
function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) document.body.style.overflow = savedOverflow
}

interface ModalShellProps {
  onClose: () => void
  label: string
  children: ReactNode
  className?: string
  style?: CSSProperties
}

// Accessible dialog behavior shared by every modal/sheet in the app: dialog
// role + aria-modal, a focus trap (Tab wraps within the modal instead of
// escaping to the page behind it), Escape-to-close, body scroll lock while
// open, and focus restored to whatever triggered the modal on close.
// Wraps the modal's own panel element — the backdrop (click-outside-to-close,
// positioning) stays owned by each modal since that varies per modal.
export default function ModalShell({ onClose, label, children, className, style }: ModalShellProps) {
  const ref = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  // Kept current via its own effect (runs after every render) rather than
  // during render, so the mount effect below can close over a stable ref
  // without needing onClose in its dependency array — depending on it
  // directly would tear the listener down and re-run focus/scroll-lock
  // setup on every parent re-render (stealing focus while typing).
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    lockBodyScroll()

    // Don't steal focus from a child that already claimed it (e.g.
    // SearchAddModal's search input uses autoFocus).
    if (!ref.current?.contains(document.activeElement)) {
      const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(first ?? ref.current)?.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unlockBodyScroll()
      previouslyFocused.current?.focus?.()
    }
  }, [])

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={className} style={style}>
      {children}
    </div>
  )
}
