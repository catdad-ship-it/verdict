'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { WHAT_WORKED_OPTIONS, PostWatchAnswers } from '@/lib/types'

interface Props {
  title: string
  posterPath: string | null
  runtime?: number | null
  year?: number
  mediaType: 'movie' | 'tv'
  seasonNumber?: number
  onSave: (answers: PostWatchAnswers) => void
  onClose: () => void
}

export default function PostWatchModal({ title, runtime, year, mediaType, seasonNumber, onSave, onClose }: Props) {
  const [rating, setRating]     = useState(0)
  const [hovered, setHovered]   = useState(0)
  const [worked, setWorked]     = useState<string[]>([])
  const [wantMore, setWantMore] = useState<boolean | null>(null)

  const ratingLabels = ['', 'Skip it', 'Eh, okay', 'Worth watching', 'Really good', 'Masterpiece']

  function toggleWorked(tag: string) {
    setWorked(w => w.includes(tag) ? w.filter(x => x !== tag) : [...w, tag])
  }

  function handleSave() {
    if (!rating) return
    onSave({ userRating: rating, whatWorked: worked, wantMoreLikeThis: wantMore ?? true })
  }

  const subtitle = mediaType === 'tv' && seasonNumber
    ? `Season ${seasonNumber}`
    : year ? String(year) : ''

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
         style={{ background: 'rgba(0,0,0,0.88)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-sm p-8 relative"
           style={{ background: 'var(--surface)', border: '1px solid var(--amber)', boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 0 40px rgba(192,120,24,0.1)' }}>
        <button onClick={onClose} className="absolute top-3 right-4" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-12 h-18 rounded-sm flex items-center justify-center text-2xl flex-shrink-0"
               style={{ background: 'var(--raised)', minHeight: '72px' }}>🎬</div>
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--amber)' }}>
              {mediaType === 'tv' ? '◼ SEASON ENDED' : '◼ TAPE ENDED'}
            </p>
            <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--cream)' }}>{title}</h3>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {subtitle}{runtime ? ` · ${Math.floor(runtime/60)}h ${runtime%60}m` : ''}
            </p>}
          </div>
        </div>

        {/* Rating */}
        <div className="mb-5">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>How'd you rate it?</p>
          <div className="flex items-center gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                className="text-2xl w-11 h-11 rounded-sm transition-all"
                style={{
                  background: n <= (hovered || rating) ? 'rgba(192,120,24,0.15)' : 'var(--card)',
                  border: `1px solid ${n <= (hovered || rating) ? 'var(--amber)' : 'var(--border)'}`,
                  color: n <= (hovered || rating) ? 'var(--amber)' : 'var(--very-muted)',
                  textShadow: n <= (hovered || rating) ? '0 0 8px rgba(192,120,24,0.5)' : 'none',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 0 #0A0806',
                }}>★</button>
            ))}
            {(hovered || rating) > 0 && (
              <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>
                {ratingLabels[hovered || rating]}
              </span>
            )}
          </div>
        </div>

        {/* What worked */}
        <div className="mb-5">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>What worked? (pick all that apply)</p>
          <div className="flex flex-wrap gap-2">
            {WHAT_WORKED_OPTIONS.map(tag => (
              <button key={tag}
                onClick={() => toggleWorked(tag)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: worked.includes(tag) ? 'rgba(192,120,24,0.1)' : 'var(--card)',
                  border: `1px solid ${worked.includes(tag) ? 'var(--amber)' : 'var(--border)'}`,
                  color: worked.includes(tag) ? 'var(--amber)' : 'var(--muted)',
                }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Want more */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>More of this, or switch it up?</p>
          <div className="flex gap-2">
            {[
              { val: true,  label: '▶▶ MORE LIKE THIS' },
              { val: false, label: '⏩ SWITCH IT UP' },
            ].map(({ val, label }) => (
              <button key={String(val)}
                onClick={() => setWantMore(val)}
                className="flex-1 text-xs font-semibold tracking-widest uppercase py-2.5 rounded-sm transition-all"
                style={{
                  background: wantMore === val ? 'rgba(192,120,24,0.1)' : 'var(--card)',
                  border: `1px solid ${wantMore === val ? 'var(--amber)' : 'var(--border)'}`,
                  color: wantMore === val ? 'var(--amber)' : 'var(--muted)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={!rating}
          className="vcr-btn-primary w-full py-3 text-sm"
          style={{ opacity: rating ? 1 : 0.5, cursor: rating ? 'pointer' : 'not-allowed' }}>
          ⏏ SAVE &amp; REWIND →
        </button>
      </div>
    </div>
  )
}
