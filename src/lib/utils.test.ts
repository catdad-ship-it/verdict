import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { genreLabel, relativeTime, apiFetch, ApiError, fetchProvidersBatch } from './utils'

describe('genreLabel', () => {
  it('joins up to two genre names', () => {
    expect(genreLabel([28, 12])).toBe('Action / Adventure')
  })

  it('truncates to the first two ids', () => {
    expect(genreLabel([28, 12, 18])).toBe('Action / Adventure')
  })

  it('drops unknown genre ids', () => {
    expect(genreLabel([999999])).toBe('')
  })

  it('returns empty string for no genres', () => {
    expect(genreLabel([])).toBe('')
  })
})

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns "Just now" for under a minute', () => {
    expect(relativeTime(new Date('2026-01-06T11:59:30Z').toISOString())).toBe('Just now')
  })

  it('formats minutes', () => {
    expect(relativeTime(new Date('2026-01-06T11:45:00Z').toISOString())).toBe('15m ago')
  })

  it('formats hours', () => {
    expect(relativeTime(new Date('2026-01-06T09:00:00Z').toISOString())).toBe('3h ago')
  })

  it('formats days', () => {
    expect(relativeTime(new Date('2026-01-03T12:00:00Z').toISOString())).toBe('3d ago')
  })

  it('formats weeks', () => {
    expect(relativeTime(new Date('2025-12-16T12:00:00Z').toISOString())).toBe('3w ago')
  })
})

describe('apiFetch', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns the response when ok', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    const res = await apiFetch('/api/whatever')
    expect(res.status).toBe(200)
  })

  it('throws ApiError with the status on a non-2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('', { status: 500 }))
    await expect(apiFetch('/api/whatever')).rejects.toThrow(ApiError)
    global.fetch = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    await expect(apiFetch('/api/whatever')).rejects.toMatchObject({ status: 404 })
  })
})

describe('fetchProvidersBatch', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch })

  it('returns an empty object for no items without calling fetch', async () => {
    global.fetch = vi.fn()
    const result = await fetchProvidersBatch([])
    expect(result).toEqual({})
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns the results map from the batch endpoint', async () => {
    const results = { 'movie:603': { providers: [], ownedProviders: [], hasRent: false, hasBuy: false } }
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results }), { status: 200 }))
    const result = await fetchProvidersBatch([{ tmdbId: 603, mediaType: 'movie' }])
    expect(result).toEqual(results)
  })

  it('swallows fetch errors and returns an empty object', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    const result = await fetchProvidersBatch([{ tmdbId: 603, mediaType: 'movie' }])
    expect(result).toEqual({})
  })
})
