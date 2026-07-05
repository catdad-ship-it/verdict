import { createClient } from '@/lib/supabase/server'
import type { ActivityItem } from '@/lib/activity'
import { NextResponse } from 'next/server'

// Merges the three tables that already track "when did the user do something"
// (queue adds, watched movies, watched shows) into one recency-sorted feed.
// Nothing new persisted — purely derived at request time.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: added }, { data: watchedMovies }, { data: watchedShows }] = await Promise.all([
    supabase.from('queue_items')
      .select('id, title, poster_path, added_at')
      .eq('user_id', user.id).order('added_at', { ascending: false }).limit(8),
    supabase.from('watched_movies')
      .select('id, title, poster_path, watched_at, user_rating')
      .eq('user_id', user.id).order('watched_at', { ascending: false }).limit(8),
    supabase.from('watched_shows')
      .select('id, title, poster_path, updated_at, status')
      .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(8),
  ])

  const items: ActivityItem[] = [
    ...(added ?? []).map(r => ({
      id: `added-${r.id}`, type: 'added' as const,
      title: r.title, posterPath: r.poster_path, timestamp: r.added_at,
    })),
    ...(watchedMovies ?? []).map(r => ({
      id: `movie-${r.id}`, type: 'watched_movie' as const,
      title: r.title, posterPath: r.poster_path, timestamp: r.watched_at, rating: r.user_rating,
    })),
    ...(watchedShows ?? []).map(r => ({
      id: `show-${r.id}`, type: 'watched_show' as const,
      title: r.title, posterPath: r.poster_path, timestamp: r.updated_at, status: r.status,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8)

  return NextResponse.json(items)
}
