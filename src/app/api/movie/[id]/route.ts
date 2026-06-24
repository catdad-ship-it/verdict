import { getMovie } from '@/lib/tmdb'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const movie = await getMovie(parseInt(params.id))
    return NextResponse.json(movie)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
