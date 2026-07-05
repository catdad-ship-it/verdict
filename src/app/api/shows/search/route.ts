import { searchShows } from '@/lib/tmdb'
import { badRequest } from '@/lib/validate'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return badRequest('q is required')
  try {
    const shows = await searchShows(q)
    return NextResponse.json(shows)
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
