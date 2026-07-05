export interface ActivityItem {
  id: string
  type: 'added' | 'watched_movie' | 'watched_show'
  title: string
  posterPath: string | null
  timestamp: string
  rating?: number | null
  status?: string
}
