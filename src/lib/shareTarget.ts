// Android's share sheet sends whatever the source app puts in title/text —
// YouTube/IMDb/Letterboxd all append their own site name, which would
// otherwise pollute the search query.
const SITE_SUFFIX = /\s*[-|]\s*(YouTube|IMDb|Letterboxd)\s*$/i

export function extractShareQuery(params: { title?: string; text?: string; url?: string }): string {
  const primary = (params.title || params.text || '').replace(SITE_SUFFIX, '').trim()
  if (primary) return primary

  if (params.url) {
    try {
      const slug = new URL(params.url).pathname.split('/').filter(Boolean).pop() ?? ''
      return slug.replace(/[-_]/g, ' ').trim()
    } catch {
      return ''
    }
  }

  return ''
}
