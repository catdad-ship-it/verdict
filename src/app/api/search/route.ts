import { searchMovies } from '@/lib/tmdb'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json([])
  const results = await searchMovies(q)
  return NextResponse.json(results)
}
