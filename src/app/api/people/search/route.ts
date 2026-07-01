import { searchPeople } from '@/lib/tmdb'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json([])
  try {
    const people = await searchPeople(q)
    return NextResponse.json(people)
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
