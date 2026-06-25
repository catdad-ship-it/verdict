'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Dice3, Plus, TrendingUp, ChevronDown, Check, Trash2, X } from 'lucide-react'
import VHSCard from '@/components/ui/VHSCard'
import SpinWheelModal from '@/components/modals/SpinWheelModal'
import PostWatchModal from '@/components/modals/PostWatchModal'
import SearchAddModal from '@/components/modals/SearchAddModal'
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
  rtScore?: number | null; redditVotes?: number; overview?: string
  genreIds?: number[]; mediaType?: string
}

type ActiveList = 'queue' | string

export default function HomePage() {
  const [queue, setQueue]           = useState<QueueItem[]>([])
  const [lists, setLists]           = useState<UserList[]>([])
  const [activeList, setActiveList] = useState<ActiveList>('queue')
  const [listItems, setListItems]   = useState<ListItem[]>([])
  const [trending, setTrending]     = useState<{ movies: TrendingItem[]; shows: TrendingItem[] }>({ movies: [], shows: [] })
  const [showSpin, setShowSpin]     = useState(false)
  const [postWatch, setPostWatch]   = useState<QueueItem | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showListPicker, setShowListPicker] = useState(false)
  const [showSelector, setShowSelector]     = useState(false)
  const [showNewList, setShowNewList]       = useState(false)
  const [newListName, setNewListName]       = useState('')
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState<'all' | 'movie' | 'tv'>('all')
  const [sort, setSort]             = useState<'added' | 'runtime' | 'title'>('added')
  const [addTarget, setAddTarget]   = useState<ActiveList>('queue')
  const selectorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setShowSelector(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    const data = await fetch('/api/queue').then(r => r.json())
    setQueue(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  const fetchLists = useCallback(async () => {
    const data = await fetch('/api/lists').then(r => r.json())
    setLists(Array.isArray(data) ? data : [])
  }, [])

  const fetchListItems = useCallback(async (listId: string) => {
    setLoading(true)
    const data = await fetch(`/api/lists/${listId}/items`).then(r => r.json())
    setListItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchQueue()
    fetchLists()
    fetch('/api/trending').then(r => r.json()).then(setTrending).catch(() => {})
  }, [fetchQueue, fetchLists])

  useEffect(() => {
    if (activeList !== 'queue') fetchListItems(activeList)
  }, [activeList, fetchListItems])

  const switchList = (id: ActiveList) => {
    setActiveList(id)
    setShowSelector(false)
    setFilter('all')
    setSort('added')
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

  const removeFromQueue = async (tmdbId: number, mediaType: string) => {
    await fetch('/api/queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, mediaType }),
    })
    setQueue(q => q.filter(i => !(i.tmdbId === tmdbId && i.mediaType === mediaType)))
  }

  const removeFromList = async (listId: string, tmdbId: number, mediaType: string) => {
    await fetch(`/api/lists/${listId}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, mediaType }),
    })
    setListItems(items => items.filter(i => !(i.tmdb_id === tmdbId && i.media_type === mediaType)))
  }

  const handlePostWatchSave = async (answers: PostWatchAnswers) => {
    if (!postWatch) return
    await fetch('/api/watched', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type:  postWatch.mediaType === 'tv' ? 'show' : 'movie',
        tmdb_id:     postWatch.tmdbId,
        title:       postWatch.title,
        poster_path: postWatch.posterPath,
        genre_ids:   postWatch.genreIds,
        runtime:     postWatch.runtime,
        user_rating: answers.userRating,
        what_worked: answers.whatWorked,
        want_more:   answers.wantMoreLikeThis,
        status:      postWatch.mediaType === 'tv' ? 'watching' : undefined,
      }),
    })
    if (activeList === 'queue') await fetchQueue()
    else await fetchListItems(activeList)
    setPostWatch(null)
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

  const displayItems = sourceItems
    .filter(i => filter === 'all' || i.mediaType === filter)
    .sort((a, b) => {
      if (sort === 'title')   return a.title.localeCompare(b.title)
      if (sort === 'runtime') return (a.runtime ?? 999) - (b.runtime ?? 999)
      return 0 // 'added' → API already returns newest-first
    })

  const movieItems = queue.filter(i => i.mediaType === 'movie')
  const anyModalOpen = !!(postWatch || showSpin || showSearch || showListPicker)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>

        {/* List selector dropdown */}
        <div ref={selectorRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSelector(s => !s)}
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
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 40,
              background: 'var(--surface)', border: '1px solid var(--amber-dim)',
              borderRadius: 4, minWidth: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}>
              {/* Queue */}
              <button
                onClick={() => switchList('queue')}
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
                <div key={l.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => switchList(l.id)}
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
                    onClick={() => deleteList(l.id)}
                    title="Delete list"
                    style={{ padding: '0.75rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {/* New list */}
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {showNewList ? (
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: 6 }}>
                    <input
                      autoFocus
                      value={newListName}
                      onChange={e => setNewListName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') setShowNewList(false) }}
                      placeholder="List name..."
                      style={{
                        flex: 1, background: 'var(--raised)', border: '1px solid var(--amber-dim)',
                        borderRadius: 2, color: 'var(--cream)', fontFamily: 'var(--font-mono)',
                        fontSize: 12, padding: '0.3rem 0.5rem', outline: 'none',
                      }}
                    />
                    <button
                      onClick={createList}
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
                    onClick={() => setShowNewList(true)}
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

        {/* Spin */}
        <div style={{ display: 'flex', gap: 8 }}>
          {activeList === 'queue' && (
            <button onClick={() => setShowSpin(true)} disabled={movieItems.length === 0}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', opacity: 0.65, padding: '0.25rem', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')}>
              <Dice3 size={26} />
            </button>
          )}
        </div>
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)' }}>SORT:</span>
          {(['added','title','runtime'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)} style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, padding: '0.2rem 0.5rem',
              background: sort === s ? 'var(--amber-dim)' : 'transparent',
              color: sort === s ? 'var(--amber)' : 'var(--cream-dim)',
              border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
            }}>{s.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>LOADING...</div>
      ) : displayItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', fontSize: 13 }}>
          {sourceItems.length === 0
            ? activeList === 'queue' ? 'YOUR QUEUE IS EMPTY. TAP ＋ TO ADD.' : 'THIS LIST IS EMPTY. TAP ＋ TO ADD.'
            : 'NO TITLES MATCH THAT FILTER.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
          {displayItems.map(item => (
            <VHSCard
              key={`${item.tmdbId}-${item.mediaType}`}
              tmdbId={item.tmdbId} title={item.title} posterPath={item.posterPath}
              mediaType={item.mediaType} runtime={item.runtime} releaseYear={item.releaseYear}
              imdbRating={item.imdbRating} rtScore={item.rtScore} overview={item.overview}
              isInQueue
              onMarkWatched={() => setPostWatch(item)}
              onRemoveFromQueue={
                activeList === 'queue'
                  ? () => removeFromQueue(item.tmdbId, item.mediaType)
                  : () => removeFromList(activeList, item.tmdbId, item.mediaType)
              }
            />
          ))}
        </div>
      )}

      {/* Trending (queue only) */}
      {activeList === 'queue' && (trending.movies.length > 0 || trending.shows.length > 0) && (
        <section style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <TrendingUp size={16} color="var(--amber)" />
            <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 16, margin: 0, letterSpacing: 2 }}>TRENDING ON REDDIT</h2>
          </div>
          <div className="hscroll" style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content' }}>
              {[...trending.movies, ...trending.shows].map((item, idx) => (
                <div key={idx} style={{ width: 140, flexShrink: 0 }}>
                  <VHSCard
                    tmdbId={item.tmdbId} title={item.title} posterPath={item.posterPath}
                    mediaType={item.mediaType === 'show' ? 'tv' : 'movie'}
                    runtime={item.runtime} releaseYear={item.releaseYear}
                    imdbRating={item.imdbRating} rtScore={item.rtScore} overview={item.overview}
                    isReddit redditVotes={item.redditVotes}
                    onAddToQueue={() => addToQueue({
                      tmdbId: item.tmdbId, title: item.title, posterPath: item.posterPath,
                      mediaType: item.mediaType, genreIds: item.genreIds, runtime: item.runtime,
                      overview: item.overview,
                    })}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAB */}
      {!anyModalOpen && (
        <button
          onClick={() => lists.length === 0
            ? (setAddTarget('queue'), setShowSearch(true))
            : setShowListPicker(true)
          }
          className="vcr-fab" aria-label="Add title"
        >
          <Plus size={22} />
        </button>
      )}

      {/* List picker sheet */}
      {showListPicker && (
        <div
          className="fixed inset-0 flex flex-col justify-end md:justify-center md:items-center md:p-4"
          style={{ background: 'rgba(0,0,0,0.75)', zIndex: 60 }}
          onClick={e => e.target === e.currentTarget && setShowListPicker(false)}
        >
          <div
            className="w-full md:max-w-xs rounded-t-2xl md:rounded-sm overflow-hidden"
            style={{
              background: 'var(--surface)', border: '1px solid var(--amber)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
            }}
          >
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1rem 0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 2 }}>ADD TO...</span>
              <button onClick={() => setShowListPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            {[{ id: 'queue' as const, name: 'MY QUEUE' }, ...lists.map(l => ({ id: l.id, name: l.name.toUpperCase() }))].map(opt => (
              <button
                key={opt.id}
                onClick={() => { setAddTarget(opt.id); setShowListPicker(false); setShowSearch(true) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.9rem 1rem',
                  fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: 1,
                  background: 'transparent', color: 'var(--cream)',
                  border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,120,24,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showSpin && <SpinWheelModal items={movieItems} onClose={() => setShowSpin(false)} onPick={() => {}} />}
      {postWatch && (
        <PostWatchModal
          title={postWatch.title} posterPath={postWatch.posterPath}
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
    </div>
  )
}
