'use client'
import { useCallback } from 'react'

export interface MarkWatchedItem {
  mediaType: 'movie' | 'tv'
  tmdbId: number
  title: string
  posterPath: string | null
  // Left undefined (rather than defaulted) when the caller has no genre
  // data on hand (e.g. Watched's rewatch flow) so the POST body omits the
  // key entirely, same as before this was centralized.
  genreIds?: number[]
  runtime?: number | null
  releaseYear?: number | null
  isRewatch?: boolean
}

export interface MarkWatchedAnswers {
  userRating: number
  whatWorked: string[]
  wantMoreLikeThis: boolean
  notes?: string
  seasonNumber?: number
  showStatus?: 'watching' | 'finished' | 'dropped'
}

// POST /api/watched — shared by every "mark as watched" / rewatch flow
// (Home, UpNextBar, New Releases, Suggestions, Watched's rewatch), which
// had each built this request body from scratch with drifting field sets.
export function useMarkWatched() {
  return useCallback((item: MarkWatchedItem, answers: MarkWatchedAnswers) => {
    const body: Record<string, unknown> = {
      media_type:  item.mediaType,
      tmdb_id:     item.tmdbId,
      title:       item.title,
      poster_path: item.posterPath,
      runtime:     item.runtime ?? null,
      user_rating: answers.userRating,
      what_worked: answers.whatWorked,
      want_more:   answers.wantMoreLikeThis,
      notes:       answers.notes ?? null,
    }
    if (item.genreIds !== undefined) body.genre_ids = item.genreIds
    // watched_shows has no release_year column — only meaningful for movies.
    if (item.mediaType === 'movie' && item.releaseYear !== undefined) body.release_year = item.releaseYear
    if (item.mediaType === 'tv') {
      body.status = answers.showStatus ?? 'watching'
      if (answers.seasonNumber !== undefined) body.season_number = answers.seasonNumber
    }
    if (item.isRewatch) body.is_rewatch = true

    return fetch('/api/watched', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }, [])
}
