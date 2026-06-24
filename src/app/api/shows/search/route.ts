import { searchShows } from '@/lib/tmdb'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json([])
  try {
    const shows = await searchShows(q)
    return NextResponse.json(shows)
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
