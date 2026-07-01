'use client'
import { useEffect, useState } from 'react'

const COLORS = ['var(--amber)', 'var(--amber-lt)', 'var(--cream)', 'var(--forest)', '#D4960A']

interface Piece {
  id: number
  left: string
  dx: string
  rot: string
  delay: string
  color: string
}

// Small celebratory flourish for the 5-star ("Masterpiece") rating — pure
// CSS keyframe animation, no dependency, self-removes after it plays out.
// Randomization happens inside the effect (not during render) so it stays
// a pure component per React's rules-of-hooks purity check.
export default function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    setPieces(Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: `${Math.round(Math.random() * 100)}%`,
      dx: `${Math.round((Math.random() - 0.5) * 220)}px`,
      rot: `${Math.round((Math.random() - 0.5) * 480)}deg`,
      delay: `${Math.round(Math.random() * 140)}ms`,
      color: COLORS[i % COLORS.length],
    })))
    const t = setTimeout(onDone, 1150)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 30 }} aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            background: p.color,
            animationDelay: p.delay,
            '--dx': p.dx,
            '--rot': p.rot,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
