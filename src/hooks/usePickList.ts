'use client'
import { useCallback } from 'react'

export interface PickListItem {
  tmdbId: number
  title: string
  posterPath: string | null
  genreIds?: number[]
  runtime?: number | null
  releaseYear?: number | null
  imdbRating?: number | null
  rtScore?: number | null
  overview?: string
}

// Adds a movie to the queue or a named list, depending on which the user
// picked in ListPickerSheet — duplicated verbatim between Suggestions and
// New Releases before this was centralized.
export function usePickList() {
  return useCallback(async (listId: 'queue' | string, item: PickListItem) => {
    const body = {
      tmdbId:      item.tmdbId,
      mediaType:   'movie',
      title:       item.title,
      posterPath:  item.posterPath,
      genreIds:    item.genreIds ?? [],
      runtime:     item.runtime,
      releaseYear: item.releaseYear,
      imdbRating:  item.imdbRating,
      rtScore:     item.rtScore,
      overview:    item.overview,
    }
    const url = listId === 'queue' ? '/api/queue' : `/api/lists/${listId}/items`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }, [])
}
