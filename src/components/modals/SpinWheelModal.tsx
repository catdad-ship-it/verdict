'use client'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { QueueItem } from '@/lib/types'
import { formatRuntime } from '@/lib/utils'

interface Props {
  items: QueueItem[]
  onClose: () => void
  onPick: (item: QueueItem) => void
}

const SLICE_COLORS = [
  '#2A1808','#1A1020','#0C2010','#200808',
  '#181614','#200C38','#38081C','#181410',
]

export default function SpinWheelModal({ items, onClose, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotRef    = useRef(0)
  const [spinning, setSpinning]   = useState(false)
  const [result, setResult]       = useState<QueueItem | null>(null)

  const movies = items.filter(i => i.mediaType === 'movie').slice(0, 12)
  if (movies.length === 0) return null

  function draw(rot: number) {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const cx = 120, cy = 120, r = 112, n = movies.length
    const step = (2 * Math.PI) / n
    ctx.clearRect(0, 0, 240, 240)

    for (let i = 0; i < n; i++) {
      const a0 = rot + i * step, a1 = a0 + step
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1)
      ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length]; ctx.fill()
      ctx.strokeStyle = '#0D0B07'; ctx.lineWidth = 2; ctx.stroke()

      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + step / 2)
      ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(228,204,144,0.75)'
      ctx.font = '700 8px Inter, sans-serif'
      const lbl = movies[i].title.length > 12 ? movies[i].title.slice(0,12)+'…' : movies[i].title
      ctx.fillText(lbl, r - 8, 3.5); ctx.restore()
    }

    // Hub
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 2 * Math.PI)
    ctx.fillStyle = 'var(--amber, #C07818)' ; ctx.fill()
    ctx.fillStyle = '#0D0B07'; ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('▶', cx, cy + 1)
  }

  useEffect(() => { draw(rotRef.current) }, [movies.length])

  function spin() {
    if (spinning) return
    setSpinning(true); setResult(null)
    const total = (4 + Math.random() * 4) * 2 * Math.PI + Math.random() * 2 * Math.PI
    const dur = 3400, t0 = performance.now(), r0 = rotRef.current

    function frame(now: number) {
      const p    = Math.min((now - t0) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      rotRef.current = r0 + total * ease
      draw(rotRef.current)
      if (p < 1) { requestAnimationFrame(frame); return }

      const n = movies.length, sliceA = (2 * Math.PI) / n
      const norm = ((-rotRef.current - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
      const idx  = Math.floor(norm / sliceA) % n
      setResult(movies[idx]); setSpinning(false)
    }
    requestAnimationFrame(frame)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
         style={{ background: 'rgba(0,0,0,0.88)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-sm p-8 relative text-center"
           style={{ background: 'var(--surface)', border: '1px solid var(--amber)', boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 0 40px rgba(192,120,24,0.1)' }}>
        <button onClick={onClose} className="absolute top-3 right-4" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>

        <div className="inline-block mb-2" style={{ borderBottom: '2px solid var(--amber)', paddingBottom: '6px' }}>
          <span className="font-bold text-lg tracking-wider uppercase" style={{ color: 'var(--amber)' }}>SPIN THE WHEEL</span>
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>Can't decide? Let fate pick from your queue.</p>

        {/* Wheel */}
        <div className="relative inline-block mb-3">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
               style={{ color: 'var(--amber)', fontSize: '1.2rem', lineHeight: 1, textShadow: '0 0 8px rgba(192,120,24,0.6)' }}>▼</div>
          <canvas ref={canvasRef} width={240} height={240} style={{ display: 'block' }} />
        </div>

        {result && (
          <div className="rounded-sm p-4 mb-4"
               style={{ background: 'var(--card)', border: '1px solid var(--amber)', boxShadow: '0 0 20px rgba(192,120,24,0.15)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--amber)' }}>TONIGHT&apos;S PICK</p>
            <p className="font-bold text-xl leading-tight mb-1" style={{ color: 'var(--cream)' }}>{result.title}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {result.releaseYear}{result.runtime ? ` · ${formatRuntime(result.runtime)}` : ''}
            </p>
          </div>
        )}

        <button onClick={spin} disabled={spinning}
          className="w-full py-3 text-sm font-semibold tracking-widest uppercase rounded-sm"
          style={{
            background: 'linear-gradient(170deg, #8A4028, #6A2818)',
            border: '1px solid #A04830', borderBottomColor: '#3A1008',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 0 #280C04, 0 3px 8px rgba(0,0,0,0.4)',
            color: '#F0C898', cursor: spinning ? 'not-allowed' : 'pointer',
          }}>
          {spinning ? '⏩  SPINNING…' : result ? '🎲  SPIN AGAIN' : '🎲  SPIN IT'}
        </button>
      </div>
    </div>
  )
}
