'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { WHAT_WORKED_OPTIONS, PostWatchAnswers } from '@/lib/types'
import ConfettiBurst from '@/components/ui/ConfettiBurst'

interface Props {
  title: string
  runtime?: number | null
  year?: number
  mediaType: 'movie' | 'tv'
  seasonNumber?: number
  isRewatch?: boolean
  onSave: (answers: PostWatchAnswers) => void
  onClose: () => void
}

export default function PostWatchModal({ title, runtime, year, mediaType, seasonNumber, isRewatch, onSave, onClose }: Props) {
  const [rating, setRating]     = useState(0)
  const [hovered, setHovered]   = useState(0)
  const [worked, setWorked]     = useState<string[]>([])
  const [wantMore, setWantMore] = useState<boolean | null>(null)
  const [notes, setNotes]       = useState('')
  const [showConfetti, setShowConfetti] = useState(false)

  const ratingLabels = ['', 'Skip it', 'Eh, okay', 'Worth watching', 'Really good', 'Masterpiece']

  function toggleWorked(tag: string) {
    setWorked(w => w.includes(tag) ? w.filter(x => x !== tag) : [...w, tag])
  }

  function handleSave() {
    if (!rating) return
    onSave({ userRating: rating, whatWorked: worked, wantMoreLikeThis: wantMore ?? true, notes: notes.trim() || undefined })
  }

  const subtitle = mediaType === 'tv' && seasonNumber
    ? `Season ${seasonNumber}`
    : year ? String(year) : ''

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end md:justify-center md:items-center md:p-4"
      style={{ background: 'rgba(0,0,0,0.88)', zIndex: 60 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full md:max-w-md rounded-t-2xl md:rounded-sm relative overflow-y-auto"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--amber)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 0 40px rgba(192,120,24,0.1)',
          maxHeight: '88dvh',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
        }}
      >
        {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <button onClick={onClose} className="absolute top-3 right-4" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="w-12 rounded-sm flex items-center justify-center text-2xl flex-shrink-0"
                 style={{ background: 'var(--raised)', minHeight: '72px' }}>🎬</div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--amber)' }}>
                {isRewatch ? '◼ TAPE REWOUND' : mediaType === 'tv' ? '◼ SEASON ENDED' : '◼ TAPE ENDED'}
              </p>
              <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--cream)' }}>{title}</h3>
              {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--cream-dim)' }}>
                {subtitle}{runtime ? ` · ${Math.floor(runtime/60)}h ${runtime%60}m` : ''}
              </p>}
            </div>
          </div>

          {/* Rating */}
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--cream-dim)' }}>How'd you rate it?</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[1,2,3,4,5].map(n => (
                <button key={n}
                  onClick={() => { setRating(n); if (n === 5) setShowConfetti(true) }}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-2xl w-10 h-10 rounded-sm transition-all"
                  style={{
                    background: n <= (hovered || rating) ? 'rgba(192,120,24,0.15)' : 'var(--card)',
                    border: `1px solid ${n <= (hovered || rating) ? 'var(--amber)' : 'var(--border)'}`,
                    color: n <= (hovered || rating) ? 'var(--amber)' : 'var(--very-muted)',
                    textShadow: n <= (hovered || rating) ? '0 0 8px rgba(192,120,24,0.5)' : 'none',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 0 #0A0806',
                  }}>★</button>
              ))}
              {(hovered || rating) > 0 && (
                <span className="text-xs ml-2" style={{ color: 'var(--cream-dim)' }}>
                  {ratingLabels[hovered || rating]}
                </span>
              )}
            </div>
          </div>

          {/* What worked */}
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--cream-dim)' }}>What worked? (pick all that apply)</p>
            <div className="flex flex-wrap gap-2">
              {WHAT_WORKED_OPTIONS.map(tag => (
                <button key={tag}
                  onClick={() => toggleWorked(tag)}
                  className="text-xs px-3 py-2 rounded-full transition-all"
                  style={{
                    background: worked.includes(tag) ? 'rgba(192,120,24,0.1)' : 'var(--card)',
                    border: `1px solid ${worked.includes(tag) ? 'var(--amber)' : 'var(--border)'}`,
                    color: worked.includes(tag) ? 'var(--amber)' : 'var(--cream-dim)',
                  }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Want more */}
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--cream-dim)' }}>More of this, or switch it up?</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { val: true,  label: '▶▶ MORE' },
                { val: false, label: '◀◀ SWITCH' },
              ].map(({ val, label }) => (
                <button key={String(val)}
                  onClick={() => setWantMore(val)}
                  className="flex-1 text-xs font-semibold tracking-wide uppercase py-3 rounded-sm transition-all"
                  style={{
                    minWidth: 120,
                    background: wantMore === val ? 'rgba(192,120,24,0.1)' : 'var(--card)',
                    border: `1px solid ${wantMore === val ? 'var(--amber)' : 'var(--border)'}`,
                    color: wantMore === val ? 'var(--amber)' : 'var(--cream-dim)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--cream-dim)' }}>Notes (optional)</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onFocus={e => {
                // Give keyboard time to appear, then scroll into view
                setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
              }}
              placeholder="What stood out? Any quick thoughts..."
              rows={2}
              style={{
                width: '100%', background: 'var(--card)',
                border: '1px solid var(--border)', borderRadius: 3,
                color: 'var(--cream)', fontFamily: 'var(--font-mono)',
                fontSize: 16, padding: '0.6rem 0.75rem', outline: 'none',
                resize: 'none', lineHeight: 1.5,
              }}
            />
          </div>

          <button onClick={handleSave} disabled={!rating}
            className="vcr-btn-primary w-full py-4 text-sm"
            style={{ opacity: rating ? 1 : 0.5, cursor: rating ? 'pointer' : 'not-allowed' }}>
            ⏏ SAVE &amp; REWIND →
          </button>
        </div>
      </div>
    </div>
  )
}
