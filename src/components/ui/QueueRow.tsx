'use client'
import Image from 'next/image'
import { useState, useRef } from 'react'
import { Clock, Check, X, GripVertical } from 'lucide-react'
import { posterUrl, formatRuntime, calcFinishTime } from '@/lib/utils'
import TitleDetailModal from '@/components/modals/TitleDetailModal'

interface QueueRowProps {
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: 'movie' | 'tv'
  runtime?: number | null
  releaseYear?: number | null
  imdbRating?: number | null
  rtScore?: number | null
  overview?: string | null
  currentSeason?: number
  totalSeasons?: number
  isPinned?: boolean
  onPin?: () => void
  onMarkWatched?: () => void
  onRemoveFromQueue?: () => void
  // Drag-to-reorder — only meaningful when the parent list is showing its
  // natural (unsorted, unfiltered) order. `index` is this row's position in
  // that list; onReorder(from, to) is called with both indices on drop.
  index?: number
  reorderEnabled?: boolean
  onReorder?: (fromIndex: number, toIndex: number) => void
  // Multi-select mode — mutually exclusive with drag-to-reorder. While
  // selectable, tapping the row toggles selection instead of expanding, and
  // swipe gestures + per-row quick actions are disabled.
  selectable?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

export default function QueueRow({
  tmdbId, title, posterPath, mediaType, runtime, releaseYear,
  imdbRating, rtScore, overview,
  currentSeason, totalSeasons,
  isPinned, onPin,
  onMarkWatched, onRemoveFromQueue,
  index, reorderEnabled, onReorder,
  selectable, isSelected, onToggleSelect,
}: QueueRowProps) {
  const imgUrl = posterUrl(posterPath)
  const finish = runtime ? calcFinishTime(runtime) : null

  // Click-to-expand: same TitleDetailModal used by New Releases/Suggestions,
  // so a title looks and behaves the same whether you got to it from the
  // queue, a list, or a suggestion shelf. Replaces the old inline accordion
  // (which duplicated synopsis/provider/trailer fetching that the modal
  // already does).
  const [detailOpen, setDetailOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  // Swipe right = mark watched, swipe left = dismiss (remove from queue/list).
  // Pointer Events unify mouse + touch; `touch-action: pan-y` on the draggable
  // layer keeps vertical page scroll working while we own horizontal drags.
  const SWIPE_THRESHOLD = 96
  const MAX_DRAG = 140
  const dragRef = useRef({ startX: 0, startY: 0, pointerId: null as number | null, locked: false, active: false })
  const suppressClickRef = useRef(false)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exitingRemove, setExitingRemove] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (selectable || detailOpen || removing || exitingRemove) return
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, locked: false, active: true }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.active || d.pointerId !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.locked) {
      // Not enough movement yet to tell a tap from a drag
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      // More vertical than horizontal — this is a scroll, not a swipe
      if (Math.abs(dy) > Math.abs(dx)) { d.active = false; return }
      d.locked = true
      setIsDragging(true)
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
    }
    let next = dx
    if (next > 0 && !onMarkWatched) next = 0
    if (next < 0 && !onRemoveFromQueue) next = 0
    next = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, next))
    setDragX(next)
  }

  const handlePointerEnd = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.active || d.pointerId !== e.pointerId) return
    d.active = false
    if (!d.locked) return // was just a tap — let the normal onClick handle it
    setIsDragging(false)
    suppressClickRef.current = true
    if (dragX >= SWIPE_THRESHOLD && onMarkWatched) {
      setDragX(0)
      onMarkWatched()
    } else if (dragX <= -SWIPE_THRESHOLD && onRemoveFromQueue) {
      setExitingRemove(true)
      setRemoving(true)
      onRemoveFromQueue()
    } else {
      setDragX(0)
    }
  }

  const handleExpand = () => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return }
    setDetailOpen(true)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRemoving(true)
    onRemoveFromQueue?.()
  }

  const handleWatched = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkWatched?.()
  }

  // Native HTML5 drag-and-drop: only the grip handle is `draggable`, but the
  // whole row is a drop target, so dropping anywhere on a row reorders it —
  // kept as a separate sibling from the Pointer-Events swipe layer below so
  // the two gesture systems never see each other's events.
  const [dragOver, setDragOver] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragOver) setDragOver(true)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const fromIndex = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(fromIndex) && index != null && fromIndex !== index) onReorder?.(fromIndex, index)
  }

  return (
    <>
    <div
      onDragOver={reorderEnabled ? handleDragOver : undefined}
      onDragLeave={reorderEnabled ? () => setDragOver(false) : undefined}
      onDrop={reorderEnabled ? handleDrop : undefined}
      style={{ display: 'flex', alignItems: 'stretch' }}
    >
      {reorderEnabled && !selectable && (
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={() => setDragOver(false)}
          title="Drag to reorder"
          style={{
            display: 'flex', alignItems: 'center', cursor: 'grab',
            color: 'var(--muted)', flexShrink: 0, paddingRight: 4,
          }}
        >
          <GripVertical size={14} />
        </div>
      )}
      <div style={{
        position: 'relative', overflow: 'hidden', flex: 1, minWidth: 0,
        borderBottom: '1px solid var(--border)',
        borderTop: dragOver ? '2px solid var(--amber)' : '2px solid transparent',
      }}>
      {/* Swipe action background — revealed as the row underneath slides away */}
      {dragX !== 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: dragX > 0 ? 'flex-start' : 'flex-end', padding: '0 22px',
          background: dragX > 0 ? '#1F3D28' : '#4A1616',
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1.5, fontWeight: 700,
            color: dragX > 0 ? '#A8C898' : '#F0A8A8',
            opacity: Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1),
          }}>
            {dragX > 0 ? <><Check size={16} /> WATCHED</> : <>DISMISS <X size={16} /></>}
          </span>
        </div>
      )}

      {/* Draggable foreground — swipe right = watched, swipe left = dismiss */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        style={{
          position: 'relative', background: 'var(--bg)',
          transform: exitingRemove ? 'translateX(-120%)' : `translateX(${dragX}px)`,
          opacity: exitingRemove ? 0 : (removing ? 0.4 : 1),
          transition: isDragging ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
          touchAction: 'pan-y',
          userSelect: isDragging ? 'none' : undefined,
        }}
      >
      {/* Main row — tap anywhere except buttons to expand (or toggle selection in select mode) */}
      <div
        onClick={selectable ? onToggleSelect : handleExpand}
        role="button"
        tabIndex={0}
        aria-label={selectable ? `${isSelected ? 'Deselect' : 'Select'} ${title}` : `View details for ${title}`}
        onKeyDown={e => {
          // Only when the row itself is focused — the WATCHED/remove
          // buttons handle their own Enter/Space and must not also
          // expand/toggle-select the row.
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            ;(selectable ? onToggleSelect : handleExpand)?.()
          }
        }}
        style={{ display: 'flex', gap: 12, padding: '10px 0', cursor: 'pointer', alignItems: selectable ? 'center' : undefined }}
      >
        {selectable && (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, flexShrink: 0,
              border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
              background: isSelected ? 'var(--amber)' : 'transparent',
              borderRadius: 3,
            }}
          >
            {isSelected && <Check size={13} color="var(--bg)" />}
          </div>
        )}

        {/* Poster */}
        <div style={{
          width: 60, flexShrink: 0, borderRadius: 2, overflow: 'hidden',
          position: 'relative', aspectRatio: '2/3', background: 'var(--raised)',
        }}>
          {imgUrl ? (
            <Image src={imgUrl} alt={title} fill className="object-cover" sizes="60px" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.25rem', opacity: 0.15 }}>🎬</span>
            </div>
          )}
          {mediaType === 'tv' && (
            <div style={{
              position: 'absolute', bottom: 2, left: 2,
              background: 'var(--forest)', color: '#C0E8AC',
              fontSize: 11, fontFamily: 'var(--font-mono)',
              padding: '1px 3px', borderRadius: 1, letterSpacing: 1,
            }}>TV</div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <p style={{
              fontWeight: 700, fontSize: 14, color: 'var(--cream)', margin: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: 0.2,
              flex: 1, minWidth: 0,
            }}>
              {title}
            </p>
            {isPinned && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1,
                color: 'var(--amber)', background: 'rgba(192,120,24,0.15)',
                border: '1px solid rgba(192,120,24,0.4)',
                borderRadius: 2, padding: '1px 4px', flexShrink: 0,
              }}>ON DECK</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {releaseYear && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>{releaseYear}</span>}
            {runtime    && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>{formatRuntime(runtime)}</span>}
            {mediaType === 'tv' && currentSeason && totalSeasons && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>S{currentSeason}/{totalSeasons}</span>
            )}
          </div>
          {finish && mediaType !== 'tv' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={9} style={{ color: 'var(--amber)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)' }}>
                Done by {finish.endTime}{finish.isLate ? ' +1' : ''}
              </span>
            </div>
          )}
          {(imdbRating || rtScore) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {imdbRating && <span style={{ background: '#D4960A', color: '#0A0800', fontWeight: 700, fontSize: 11, padding: '1px 4px', borderRadius: 1 }}>★ {imdbRating}</span>}
              {rtScore    && <span style={{ fontWeight: 700, fontSize: 11, color: '#D0603C' }}>🍅 {rtScore}%</span>}
            </div>
          )}
        </div>

        {/* Action buttons — hidden in select mode, where tapping the row toggles selection instead */}
        {!selectable && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', flexShrink: 0 }}>
            {onMarkWatched && (
              <button onClick={handleWatched} className="vcr-btn"
                style={{ fontSize: 11, padding: '10px', letterSpacing: 1, whiteSpace: 'nowrap', minHeight: 44, minWidth: 44 }}>
                ✓ WATCHED
              </button>
            )}
            {onRemoveFromQueue && (
              <button onClick={handleRemove}
                style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: 2,
                  color: 'var(--cream-dim)', cursor: 'pointer', fontSize: 14, padding: '10px',
                  fontFamily: 'var(--font-mono)', lineHeight: 1, minHeight: 44, minWidth: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--cream-dim)')}
              >✕</button>
            )}
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
    {detailOpen && (
      <TitleDetailModal
        tmdbId={tmdbId} title={title} posterPath={posterPath} mediaType={mediaType}
        runtime={runtime} releaseYear={releaseYear} imdbRating={imdbRating} rtScore={rtScore}
        overview={overview} currentSeason={currentSeason} totalSeasons={totalSeasons}
        isInQueue isPinned={isPinned} onPin={onPin}
        onMarkWatched={onMarkWatched}
        onRemoveFromQueue={onRemoveFromQueue}
        onClose={() => setDetailOpen(false)}
      />
    )}
    </>
  )
}
