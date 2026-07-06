import { describe, it, expect } from 'vitest'
import { extractShareQuery } from './shareTarget'

describe('extractShareQuery', () => {
  it('strips a trailing YouTube suffix from the title', () => {
    expect(extractShareQuery({ title: 'The Matrix (1999) Trailer - YouTube' })).toBe('The Matrix (1999) Trailer')
  })

  it('strips a trailing IMDb suffix from the title', () => {
    expect(extractShareQuery({ title: 'The Wire (TV Series 2002–2008) - IMDb' })).toBe('The Wire (TV Series 2002–2008)')
  })

  it('strips a trailing Letterboxd suffix from the title', () => {
    expect(extractShareQuery({ title: 'Oppenheimer - Letterboxd' })).toBe('Oppenheimer')
  })

  it('falls back to text when title is missing', () => {
    expect(extractShareQuery({ text: 'Dune: Part Two' })).toBe('Dune: Part Two')
  })

  it('prefers title over text when both are present', () => {
    expect(extractShareQuery({ title: 'Dune - IMDb', text: 'check this out' })).toBe('Dune')
  })

  it('falls back to a slug derived from the url when title/text are empty', () => {
    expect(extractShareQuery({ url: 'https://letterboxd.com/film/oppenheimer-2023/' })).toBe('oppenheimer 2023')
  })

  it('returns an empty string when nothing usable is present', () => {
    expect(extractShareQuery({})).toBe('')
  })

  it('returns an empty string for an unparseable url with no title/text', () => {
    expect(extractShareQuery({ url: 'not a url' })).toBe('')
  })
})
