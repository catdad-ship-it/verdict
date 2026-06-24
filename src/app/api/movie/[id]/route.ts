import { getMovie } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const movie = await getMovie(Number(params.id))
  if (!movie) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const ratings = await getRatings(movie.title, movie.releaseYear)
  return NextResponse.json({ ...movie, ...ratings })
}
