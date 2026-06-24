export { posterUrl } from './tmdb'
export { calcFinishTime, formatRuntime } from './finishTime'

export function genreLabel(ids: number[]): string {
  const { TMDB_GENRES } = require('./types')
  return ids.slice(0, 2).map((id: number) => TMDB_GENRES[id]).filter(Boolean).join(' / ')
}
