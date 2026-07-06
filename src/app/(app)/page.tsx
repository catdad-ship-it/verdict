'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Dice3, Plus, TrendingUp, ChevronDown, Check, Trash2, X, Search, Clock, Share2 } from 'lucide-react'
import VHSCard from '@/components/ui/VHSCard'
import QueueRow from '@/components/ui/QueueRow'
import SpinWheelModal from '@/components/modals/SpinWheelModal'
import PostWatchModal from '@/components/modals/PostWatchModal'
import SearchAddModal from '@/components/modals/SearchAddModal'
import WatchTonightModal from '@/components/modals/WatchTonightModal'
import ListPickerSheet from '@/components/ui/ListPickerSheet'
import ActivityFeed from '@/components/ui/ActivityFeed'
import BulkActionBar, { BulkActionButton, SelectModeToggle } from '@/components/ui/BulkActionBar'
import FilterChips from '@/components/ui/FilterChips'
import { apiFetch, fetchProvidersBatch, type ProviderData } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useMarkWatched } from '@/hooks/useMarkWatched'
import { useBulkSelect } from '@/hooks/useBulkSelect'
import { RowListSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import type { QueueItem, PostWatchAnswers } from '@/lib/types'

interface UserList { id: string; name: string }
interface ListItem {
  id: string; list_id: string; tmdb_id: number; media_type: string
  title: string; poster_path: string | null; genre_ids: number[]
  runtime: number | null; release_year: number | null
  imdb_rating: number | null; rt_score: number | null; overview: string | null
  added_at: string
}
interface TrendingItem {
  tmdbId: number; title: string; posterPath: string | null
  runtime?: number; releaseYear?: number | null; imdbRating?: number | null
  rtScore?: number | null; watchers?: number; overview?: string
  genreIds?: number[]; mediaType?: string
}

type ActiveList = 'queue' | string

// Defined at module scope so React doesn't see a new component type on each
// render (see new-releases/page.tsx's Shelf for the same pattern) — a new
// type would unmount/remount every VHSCard and re-fire its provider fetch.
function TrendingShelf({
  trending, providersMap, onAddToQueue,
}: {
  trending: { movies: TrendingItem[]; shows: TrendingItem[] }
  providersMap: Record<string, ProviderData>
  onAddToQueue: (item: TrendingItem) => void
}) {
  if (trending.movies.length === 0 && trending.shows.length === 0) return null
  return (
    <section style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <TrendingUp size={16} color="var(--amber)" />
        <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 16, margin: 0, letterSpacing: 2 }}>TRENDING NOW</h2>
      </div>
      <div className="hscroll" style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content' }}>
          {[...trending.movies, ...trending.shows].map((item, idx) => (
            <div key={idx} style={{ width: 140, flexShrink: 0 }}>
              <VHSCard
                tmdbId={item.tmdbId} title={item.title} posterPath={item.posterPath}
                mediaType={item.mediaType === 'tv' ? 'tv' : 'movie'}
                runtime={item.runtime} releaseYear={item.releaseYear}
                imdbRating={item.imdbRating} rtScore={item.rtScore} overview={item.overview}
                isTrending trendingCount={item.watchers}
                providerData={providersMap[`${item.mediaType === 'tv' ? 'tv' : 'movie'}:${item.tmdbId}`]} batchManaged
                onAddToQueue={() => onAddToQueue(item)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

interface ListSelectorDropdownProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  activeListName: string
  activeList: ActiveList
  lists: UserList[]
  showSelector: boolean
  onToggleSelector: () => void
  onSwitchList: (id: ActiveList) => void
  pendingDelete: string | null
  onRequestDelete: (id: string | null) => void
  onDeleteList: (id: string) => void
  showNewList: boolean
  onShowNewList: () => void
  newListName: string
  onNewListNameChange: (name: string) => void
  onCreateList: () => void
  onCancelNewList: () => void
}

// Same module-scope rationale as TrendingShelf above.
function ListSelectorDropdown({
  containerRef, activeListName, activeList, lists, showSelector, onToggleSelector,
  onSwitchList, pendingDelete, onRequestDelete, onDeleteList,
  showNewList, onShowNewList, newListName, onNewListNameChange, onCreateList, onCancelNewList,
}: ListSelectorDropdownProps) {
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={onToggleSelector}
        aria-expanded={showSelector}
        aria-haspopup="menu"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: 2,
        }}
      >
        {activeListName}
        <ChevronDown size={16} style={{
          opacity: 0.7,
          transform: showSelector ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }} />
      </button>

      {showSelector && (
        <div
          role="menu"
          onKeyDown={e => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
            e.preventDefault()
            const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
            const idx = items.indexOf(document.activeElement as HTMLElement)
            const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length
            items[next]?.focus()
          }}
          style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 40,
          background: 'var(--surface)', border: '1px solid var(--amber-dim)',
          borderRadius: 4, minWidth: 220, maxWidth: 'calc(100vw - 2rem)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>
          {/* Queue */}
          <button
            role="menuitem"
            onClick={() => onSwitchList('queue')}
            style={{
              width: '100%', textAlign: 'left', padding: '0.75rem 1rem',
              fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 1,
              background: activeList === 'queue' ? 'rgba(192,120,24,0.1)' : 'transparent',
              color: activeList === 'queue' ? 'var(--amber)' : 'var(--cream)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {activeList === 'queue' && <Check size={12} />}
            MY QUEUE
          </button>

          {lists.length > 0 && <div style={{ height: 1, background: 'var(--border)' }} />}

          {/* Custom lists */}
          {lists.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
              {pendingDelete === l.id ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f87171', letterSpacing: 1 }}>
                    DELETE {l.name.toUpperCase()}?
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { onDeleteList(l.id); onRequestDelete(null) }}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, padding: '0.25rem 0.6rem',
                        background: '#f87171', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', fontWeight: 700,
                      }}
                    >YES</button>
                    <button
                      onClick={() => onRequestDelete(null)}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, padding: '0.25rem 0.6rem',
                        background: 'var(--raised)', color: 'var(--cream-dim)', border: '1px solid var(--border)', borderRadius: 2, cursor: 'pointer',
                      }}
                    >NO</button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    role="menuitem"
                    onClick={() => onSwitchList(l.id)}
                    style={{
                      flex: 1, textAlign: 'left', padding: '0.75rem 1rem',
                      fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 1,
                      background: activeList === l.id ? 'rgba(192,120,24,0.1)' : 'transparent',
                      color: activeList === l.id ? 'var(--amber)' : 'var(--cream)',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    {activeList === l.id && <Check size={12} />}
                    {l.name.toUpperCase()}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`${window.location.origin}/share/${l.id}`)
                        .catch(() => {})
                      window.open(`/share/${l.id}`, '_blank', 'noopener')
                    }}
                    title="Share list"
                    style={{ padding: '0.75rem 0.5rem', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--amber)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                  >
                    <Share2 size={12} />
                  </button>
                  <button
                    onClick={() => onRequestDelete(l.id)}
                    title="Delete list"
                    style={{ padding: '0.75rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          ))}

          {/* New list */}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {showNewList ? (
              <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  value={newListName}
                  onChange={e => onNewListNameChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') onCreateList(); if (e.key === 'Escape') onCancelNewList() }}
                  placeholder="List name..."
                  style={{
                    flex: 1, background: 'var(--raised)', border: '1px solid var(--amber-dim)',
                    borderRadius: 2, color: 'var(--cream)', fontFamily: 'var(--font-mono)',
                    fontSize: 16, padding: '0.3rem 0.5rem', outline: 'none',
                  }}
                />
                <button
                  onClick={onCreateList}
                  style={{
                    background: 'var(--amber)', border: 'none', borderRadius: 2,
                    color: 'var(--bg)', fontFamily: 'var(--font-mono)', fontSize: 11,
                    padding: '0.3rem 0.6rem', cursor: 'pointer', fontWeight: 700,
                  }}
                >
                  CREATE
                </button>
              </div>
            ) : (
              <button
                onClick={onShowNewList}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.75rem 1rem',
                  fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 1,
                  background: 'transparent', color: 'var(--amber)', border: 'none', cursor: 'pointer',
                }}
              >
                ＋ NEW LIST
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const toast = useToast()
  const markWatched = useMarkWatched()
  const [queue, setQueue]           = useState<QueueItem[]>([])
  const [lists, setLists]           = useState<UserList[]>([])
  const [activeList, setActiveList] = useState<ActiveList>('queue')
  const [listItems, setListItems]   = useState<ListItem[]>([])
  const [trending, setTrending]     = useState<{ movies: TrendingItem[]; shows: TrendingItem[] }>({ movies: [], shows: [] })
  const [providersMap, setProvidersMap] = useState<Record<string, ProviderData>>({})
  const [showSpin, setShowSpin]     = useState(false)
  const [postWatch, setPostWatch]   = useState<QueueItem | null>(null)
  const [showSearch, setShowSearch]       = useState(false)
  const [showWatchTonight, setShowWatchTonight] = useState(false)
  const [showListPicker, setShowListPicker] = useState(false)
  const [showSelector, setShowSelector]     = useState(false)
  const [showNewList, setShowNewList]       = useState(false)
  const [newListName, setNewListName]       = useState('')
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(false)
  const [filter, setFilter]         = useState<'all' | 'movie' | 'tv'>('all')
  const [sort, setSort]             = useState<'added' | 'runtime' | 'title' | 'year' | 'rating'>('added')
  const [defaultSort, setDefaultSort] = useState<'added' | 'runtime' | 'title' | 'year' | 'rating'>('added')
  const [search, setSearch]         = useState('')
  const [pinnedKey, setPinnedKey]   = useState<string | null>(null)
  const [addTarget, setAddTarget]   = useState<ActiveList>('queue')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Multi-select bulk actions
  const [selectMode, setSelectMode] = useState(false)
  const { selected, toggle: toggleSelect, selectAll, clear: clearSelected } = useBulkSelect<string>()
  const [showBulkListPicker, setShowBulkListPicker] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setShowSelector(false)
        setPendingDelete(null)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler as EventListener, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler as EventListener)
    }
  }, [])

  // loading defaults to true, so the initial mount fetch already shows the
  // skeleton without setting it here — and later refetches (after an
  // add/remove) intentionally don't flip it back on, so the list updates in
  // place instead of flashing the skeleton over content already on screen.
  const fetchQueue = useCallback(async () => {
    try {
      const data = await apiFetch('/api/queue').then(r => r.json())
      setQueue(Array.isArray(data) ? data : [])
      setLoadError(false)
    } catch (err) {
      console.error('fetchQueue failed:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLists = useCallback(async () => {
    try {
      const data = await apiFetch('/api/lists').then(r => r.json())
      setLists(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('fetchLists failed:', err)
    }
  }, [])

  // Tracks the most recently requested list so a slow response for a list
  // the user has since switched away from can't land after — and overwrite
  // — a faster response for the list actually on screen.
  const listItemsRequestRef = useRef<string | null>(null)

  const fetchListItems = useCallback(async (listId: string) => {
    listItemsRequestRef.current = listId
    // listItems is one shared array reused across whichever list is active —
    // without this, switching lists would flash the *previous* list's items
    // under the new tab's label until the fetch resolves.
    setLoading(true)
    try {
      const data = await apiFetch(`/api/lists/${listId}/items`).then(r => r.json())
      if (listItemsRequestRef.current !== listId) return
      setListItems(Array.isArray(data) ? data : [])
      setLoadError(false)
    } catch (err) {
      if (listItemsRequestRef.current !== listId) return
      console.error('fetchListItems failed:', err)
      setLoadError(true)
    } finally {
      if (listItemsRequestRef.current === listId) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // fetchQueue/fetchLists are shared with imperative refetches elsewhere
    // (add/remove handlers, list switching) — inlining their fetch logic
    // here to dodge this lint rule would mean duplicating it at every call
    // site instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueue()
    fetchLists()
    fetch('/api/settings/preferences').then(r => r.json()).then((d: { defaultQueueSort?: typeof sort }) => {
      if (d.defaultQueueSort) {
        setDefaultSort(d.defaultQueueSort)
        setSort(d.defaultQueueSort)
      }
    }).catch(() => {})
    fetch('/api/trending').then(r => r.json()).then((d: { movies: TrendingItem[]; shows: TrendingItem[] }) => {
      setTrending(d)
      const items = [...d.movies, ...d.shows].map(item => ({
        tmdbId: item.tmdbId,
        mediaType: (item.mediaType === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv',
      }))
      fetchProvidersBatch(items).then(map => setProvidersMap(prev => ({ ...prev, ...map })))
    }).catch(() => {})
  }, [fetchQueue, fetchLists])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeList !== 'queue') fetchListItems(activeList)
  }, [activeList, fetchListItems])

  // Load/clear pin when active list changes — reads localStorage, which
  // isn't available during SSR, so this has to run post-mount rather than
  // as a lazy useState initializer (that would make the client's first
  // render disagree with the server-rendered HTML).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(`verdict_pin_${activeList}`)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinnedKey(stored ?? null)
    setSearch('')
  }, [activeList])

  const handlePin = (key: string) => {
    const next = pinnedKey === key ? null : key
    setPinnedKey(next)
    if (next) localStorage.setItem(`verdict_pin_${activeList}`, next)
    else localStorage.removeItem(`verdict_pin_${activeList}`)
    // Tell the persistent "Up Next" bar (mounted in the layout) to re-sync —
    // same-tab localStorage writes don't fire the native `storage` event.
    if (activeList === 'queue') window.dispatchEvent(new Event('verdict:pin-changed'))
  }

  const switchList = (id: ActiveList) => {
    setActiveList(id)
    setShowSelector(false)
    setFilter('all')
    // Custom lists always start on "date added"; the queue respects your
    // saved default sort from Settings.
    setSort(id === 'queue' ? defaultSort : 'added')
    if (id === 'queue') fetchQueue()
  }

  const createList = async () => {
    if (!newListName.trim()) return
    const data = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newListName.trim() }),
    }).then(r => r.json())
    if (data.id) {
      setLists(l => [...l, data])
      setNewListName('')
      setShowNewList(false)
      setShowSelector(false)
      switchList(data.id)
    }
  }

  const deleteList = async (listId: string) => {
    await fetch(`/api/lists/${listId}`, { method: 'DELETE' })
    setLists(l => l.filter(x => x.id !== listId))
    if (activeList === listId) switchList('queue')
  }

  const addToQueue = async (item: {
    tmdbId: number; title: string; posterPath: string | null
    mediaType?: string; genreIds?: number[]; runtime?: number | null; overview?: string
  }) => {
    await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    if (activeList === 'queue') await fetchQueue()
  }

  const addToList = async (listId: string, item: {
    tmdbId: number; title: string; posterPath: string | null
    mediaType?: string; genreIds?: number[]; runtime?: number | null; overview?: string | null
  }) => {
    await fetch(`/api/lists/${listId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    if (activeList === listId) await fetchListItems(listId)
  }

  const handleAdd = async (item: {
    tmdbId: number; title: string; posterPath: string | null
    mediaType?: string; genreIds?: number[]; runtime?: number | null; overview?: string
  }) => {
    if (addTarget === 'queue') await addToQueue(item)
    else await addToList(addTarget, item)
  }

  // Optimistic removal — the row disappears immediately, but the DELETE
  // itself is deferred until the undo window passes, so clicking UNDO just
  // cancels it (no compensating "add it back" call needed) and restores
  // the exact item we already had in memory.
  const removeFromQueue = (tmdbId: number, mediaType: string) => {
    const original = queue.find(i => i.tmdbId === tmdbId && i.mediaType === mediaType)
    setQueue(q => q.filter(i => !(i.tmdbId === tmdbId && i.mediaType === mediaType)))
    toast.showUndo(`Removed "${original?.title ?? 'title'}" from queue`, () => {
      fetch('/api/queue', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId, mediaType }),
        keepalive: true,
      })
    }, { onUndo: () => { if (original) setQueue(q => [original, ...q]) } })
    // In case this was the pinned "Up Next" item — let the layout's bar re-sync.
    window.dispatchEvent(new Event('verdict:pin-changed'))
  }

  const removeFromList = (listId: string, tmdbId: number, mediaType: string) => {
    const original = listItems.find(i => i.tmdb_id === tmdbId && i.media_type === mediaType)
    setListItems(items => items.filter(i => !(i.tmdb_id === tmdbId && i.media_type === mediaType)))
    toast.showUndo(`Removed "${original?.title ?? 'title'}"`, () => {
      fetch(`/api/lists/${listId}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId, mediaType }),
        keepalive: true,
      })
    }, { onUndo: () => { if (original) setListItems(items => [original, ...items]) } })
  }

  // Drag-to-reorder — only meaningful in the queue's natural (unfiltered,
  // "added" sort) order, so the indices line up with what's on screen.
  // Not destructive, so this just fires the persist call without an undo toast.
  const handleReorder = (fromIndex: number, toIndex: number) => {
    setQueue(q => {
      const next = [...q]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      fetch('/api/queue/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: next.map(i => i.id) }),
      }).catch(() => {})
      return next
    })
  }

  // Multi-select bulk actions — keys are normalized `${tmdbId}-${movie|tv}`
  // so they line up whether the row came from `queue` or `listItems`.
  const selectionKey = (tmdbId: number, mediaType: string) => `${tmdbId}-${mediaType === 'tv' ? 'tv' : 'movie'}`

  const toggleSelectMode = () => {
    setSelectMode(m => !m)
    clearSelected()
  }

  const selectAllVisible = () => {
    selectAll(displayItems.map(i => selectionKey(i.tmdbId, i.mediaType)))
  }

  const handleBulkRemove = () => {
    if (selected.size === 0) return
    const count = selected.size
    if (activeList === 'queue') {
      const originals = queue.filter(i => selected.has(selectionKey(i.tmdbId, i.mediaType)))
      setQueue(q => q.filter(i => !selected.has(selectionKey(i.tmdbId, i.mediaType))))
      toast.showUndo(`Removed ${count} title${count > 1 ? 's' : ''} from queue`, () => {
        originals.forEach(o => fetch('/api/queue', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdbId: o.tmdbId, mediaType: o.mediaType }),
          keepalive: true,
        }))
      }, { onUndo: () => setQueue(q => [...originals, ...q]) })
    } else {
      const listId = activeList
      const originals = listItems.filter(i => selected.has(selectionKey(i.tmdb_id, i.media_type)))
      setListItems(items => items.filter(i => !selected.has(selectionKey(i.tmdb_id, i.media_type))))
      toast.showUndo(`Removed ${count} title${count > 1 ? 's' : ''}`, () => {
        originals.forEach(o => fetch(`/api/lists/${listId}/items`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdbId: o.tmdb_id, mediaType: o.media_type }),
          keepalive: true,
        }))
      }, { onUndo: () => setListItems(items => [...originals, ...items]) })
    }
    clearSelected()
    setSelectMode(false)
  }

  const handleBulkAddToList = async (targetListId: 'queue' | string) => {
    const items = displayItems.filter(i => selected.has(selectionKey(i.tmdbId, i.mediaType)))
    setShowBulkListPicker(false)
    if (items.length === 0) return
    await Promise.all(items.map(i => {
      const payload = {
        tmdbId: i.tmdbId, title: i.title, posterPath: i.posterPath,
        mediaType: i.mediaType, genreIds: i.genreIds, runtime: i.runtime,
        overview: i.overview ?? undefined,
      }
      return targetListId === 'queue' ? addToQueue(payload) : addToList(targetListId, payload)
    }))
    const destName = targetListId === 'queue' ? 'queue' : (lists.find(l => l.id === targetListId)?.name ?? 'list')
    toast.show(`Added ${items.length} title${items.length > 1 ? 's' : ''} to ${destName.toUpperCase()}`)
    clearSelected()
    setSelectMode(false)
  }

  const handlePostWatchSave = async (answers: PostWatchAnswers) => {
    if (!postWatch) return
    await markWatched({
      mediaType:   postWatch.mediaType,
      tmdbId:      postWatch.tmdbId,
      title:       postWatch.title,
      posterPath:  postWatch.posterPath,
      genreIds:    postWatch.genreIds,
      runtime:     postWatch.runtime,
    }, answers)
    if (activeList === 'queue') await fetchQueue()
    else await fetchListItems(activeList)
    setPostWatch(null)
    // In case this was the pinned "Up Next" item — let the layout's bar re-sync.
    window.dispatchEvent(new Event('verdict:pin-changed'))
  }

  const activeListName = activeList === 'queue'
    ? 'MY QUEUE'
    : lists.find(l => l.id === activeList)?.name?.toUpperCase() ?? 'LIST'

  const listAsQueue: QueueItem[] = listItems.map(i => ({
    id:          i.id,
    tmdbId:      i.tmdb_id,
    mediaType:   i.media_type === 'tv' ? 'tv' : 'movie',
    title:       i.title,
    posterPath:  i.poster_path,
    genreIds:    i.genre_ids ?? [],
    runtime:     i.runtime,
    releaseYear: i.release_year,
    imdbRating:  i.imdb_rating,
    rtScore:     i.rt_score,
    overview:    i.overview ?? undefined,
    addedAt:     i.added_at,
  }))

  const sourceItems = activeList === 'queue' ? queue : listAsQueue

  // React Compiler can't verify it would produce equivalent auto-memoization
  // for this filter/sort chain and skips optimizing the component as a
  // result — the manual useMemo below is unaffected and still works.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const displayItems = useMemo(() => sourceItems
    .filter(i => filter === 'all' || i.mediaType === filter)
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aKey = `${a.tmdbId}-${a.mediaType}`
      const bKey = `${b.tmdbId}-${b.mediaType}`
      if (aKey === pinnedKey) return -1
      if (bKey === pinnedKey) return 1
      if (sort === 'title')   return a.title.localeCompare(b.title)
      if (sort === 'runtime') return (a.runtime ?? 999) - (b.runtime ?? 999)
      if (sort === 'year')    return (b.releaseYear ?? 0) - (a.releaseYear ?? 0)
      if (sort === 'rating')  return (b.imdbRating ?? 0) - (a.imdbRating ?? 0)
      return 0 // 'added' → API already returns newest-first
    }), [sourceItems, filter, search, pinnedKey, sort])

  // Drag-to-reorder only makes sense when what's on screen is the queue's
  // real, unfiltered order — otherwise a dragged index wouldn't map back to
  // a sane position once the pin/filter/search/sort is removed.
  const reorderEnabled = activeList === 'queue' && sort === 'added' && filter === 'all' && !search && !pinnedKey && !selectMode

  const movieItems = queue.filter(i => i.mediaType === 'movie')
  const anyModalOpen = !!(postWatch || showSpin || showSearch || showListPicker || showWatchTonight)

  // Same "where should this add go" logic as the FAB button — pulled out so
  // the "n" keyboard shortcut can trigger the identical flow.
  const openAddFlow = useCallback(() => {
    if (lists.length === 0) {
      setAddTarget('queue')
      setShowSearch(true)
    } else {
      setShowListPicker(true)
    }
  }, [lists.length])

  // Desktop keyboard shortcuts: "/" focus search, "n" open add-title flow,
  // "Esc" close whatever's open. Skipped while the user is actively typing
  // in a field so normal text entry (including literal "/" or "n") still works.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowSpin(false)
        setShowWatchTonight(false)
        setShowListPicker(false)
        setShowSelector(false)
        setShowNewList(false)
        setShowBulkListPicker(false)
        setPostWatch(null)
        if (selectMode) { setSelectMode(false); clearSelected() }
        return
      }

      if (isTyping || anyModalOpen) return

      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openAddFlow()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [anyModalOpen, openAddFlow, selectMode, clearSelected])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>

        <ListSelectorDropdown
          containerRef={selectorRef}
          activeListName={activeListName}
          activeList={activeList}
          lists={lists}
          showSelector={showSelector}
          onToggleSelector={() => setShowSelector(s => !s)}
          onSwitchList={switchList}
          pendingDelete={pendingDelete}
          onRequestDelete={setPendingDelete}
          onDeleteList={deleteList}
          showNewList={showNewList}
          onShowNewList={() => setShowNewList(true)}
          newListName={newListName}
          onNewListNameChange={setNewListName}
          onCreateList={createList}
          onCancelNewList={() => setShowNewList(false)}
        />

        {/* Spin */}
        <div style={{ display: 'flex', gap: 8 }}>
          {activeList === 'queue' && (
            <>
              <button onClick={() => setShowWatchTonight(true)} disabled={queue.length === 0}
                title="Watch Tonight"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', opacity: 0.65, padding: '0.25rem', display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')}>
                <Clock size={22} />
              </button>
              <button onClick={() => setShowSpin(true)} disabled={movieItems.length === 0}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', opacity: 0.65, padding: '0.25rem', display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')}>
                <Dice3 size={26} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recent activity (queue view only) */}
      {activeList === 'queue' && <ActivityFeed />}

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <Search size={13} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--muted)', pointerEvents: 'none',
        }} />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search titles..."
          style={{
            width: '100%', background: 'var(--raised)',
            border: '1px solid var(--border)', borderRadius: 3,
            color: 'var(--cream)', fontFamily: 'var(--font-mono)',
            fontSize: 16, padding: '0.45rem 2rem 0.45rem 2rem',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', padding: 2,
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter/sort */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {([['all','ALL'],['movie','▶ MOVIES'],['tv','▣ SHOWS']] as const).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, padding: '0.3rem 0.7rem',
            background: filter === f ? 'var(--amber)' : 'transparent',
            color: filter === f ? 'var(--bg)' : 'var(--cream-dim)',
            border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
          }}>{label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterChips
            label="SORT:"
            options={[['added','DATE'],['title','A–Z'],['runtime','TIME'],['year','YEAR'],['rating','⭐']] as const}
            active={sort} onChange={setSort}
          />
          {displayItems.length > 0 && (
            <SelectModeToggle active={selectMode} onClick={toggleSelectMode} compact />
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <BulkActionBar count={selected.size} onSelectAll={selectAllVisible} onCancel={toggleSelectMode}>
          <BulkActionButton label="ADD TO LIST" onClick={() => setShowBulkListPicker(true)} disabled={selected.size === 0} />
          <BulkActionButton label="REMOVE" onClick={handleBulkRemove} disabled={selected.size === 0} variant="destructive" />
        </BulkActionBar>
      )}

      {/* List */}
      {loading ? (
        <RowListSkeleton count={5} />
      ) : loadError ? (
        <ErrorState onRetry={() => (activeList === 'queue' ? fetchQueue() : fetchListItems(activeList))} />
      ) : displayItems.length === 0 ? (
        sourceItems.length === 0 ? (
          <EmptyState
            title={activeList === 'queue' ? 'YOUR QUEUE IS EMPTY' : 'THIS LIST IS EMPTY'}
            subtitle="Tap the ＋ button to add your first title."
          />
        ) : (
          <EmptyState
            title={search ? 'NO TITLES MATCH THAT SEARCH' : 'NO TITLES MATCH THAT FILTER'}
            subtitle="Try a different search term or clear your filters."
          />
        )
      ) : (
        <div>
          {displayItems.map((item, i) => (
            <QueueRow
              key={`${item.tmdbId}-${item.mediaType}`}
              tmdbId={item.tmdbId} title={item.title} posterPath={item.posterPath}
              mediaType={item.mediaType} runtime={item.runtime} releaseYear={item.releaseYear}
              imdbRating={item.imdbRating} rtScore={item.rtScore} overview={item.overview}
              isPinned={pinnedKey === `${item.tmdbId}-${item.mediaType}`}
              onPin={() => handlePin(`${item.tmdbId}-${item.mediaType}`)}
              onMarkWatched={() => setPostWatch(item)}
              onRemoveFromQueue={
                activeList === 'queue'
                  ? () => removeFromQueue(item.tmdbId, item.mediaType)
                  : () => removeFromList(activeList, item.tmdbId, item.mediaType)
              }
              index={i}
              reorderEnabled={reorderEnabled}
              onReorder={handleReorder}
              selectable={selectMode}
              isSelected={selected.has(selectionKey(item.tmdbId, item.mediaType))}
              onToggleSelect={() => toggleSelect(selectionKey(item.tmdbId, item.mediaType))}
            />
          ))}
        </div>
      )}

      {/* Trending (queue only) */}
      {activeList === 'queue' && (
        <TrendingShelf
          trending={trending}
          providersMap={providersMap}
          onAddToQueue={item => addToQueue({
            tmdbId: item.tmdbId, title: item.title, posterPath: item.posterPath,
            mediaType: item.mediaType, genreIds: item.genreIds, runtime: item.runtime,
            overview: item.overview,
          })}
        />
      )}

      {/* FAB */}
      {!anyModalOpen && (
        <button
          onClick={openAddFlow}
          className="vcr-fab" aria-label="Add title"
        >
          <Plus size={22} />
        </button>
      )}

      {/* List picker sheet */}
      {showListPicker && (
        <ListPickerSheet
          lists={lists}
          onPick={listId => { setAddTarget(listId); setShowListPicker(false); setShowSearch(true) }}
          onClose={() => setShowListPicker(false)}
          onListCreated={l => setLists(prev => [...prev, l])}
        />
      )}

      {/* Modals */}
      {showSpin && <SpinWheelModal items={movieItems} onClose={() => setShowSpin(false)} />}
      {showWatchTonight && (
        <WatchTonightModal
          items={queue}
          onPin={handlePin}
          onClose={() => setShowWatchTonight(false)}
        />
      )}
      {postWatch && (
        <PostWatchModal
          title={postWatch.title}
          mediaType={postWatch.mediaType} runtime={postWatch.runtime ?? undefined}
          onSave={handlePostWatchSave} onClose={() => setPostWatch(null)}
        />
      )}
      {showSearch && (
        <SearchAddModal
          onClose={() => setShowSearch(false)}
          onAdd={async item => handleAdd({
            tmdbId: item.tmdbId, title: item.title, posterPath: item.posterPath,
            mediaType: item.mediaType, genreIds: item.genres, runtime: item.runtime,
            overview: item.overview,
          })}
        />
      )}
      {showBulkListPicker && (
        <ListPickerSheet
          lists={lists}
          onPick={handleBulkAddToList}
          onClose={() => setShowBulkListPicker(false)}
          onListCreated={l => setLists(prev => [...prev, l])}
        />
      )}
    </div>
  )
}
