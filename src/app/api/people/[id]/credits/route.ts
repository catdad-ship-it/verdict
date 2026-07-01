import { getPersonCredits } from '@/lib/tmdb'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const personId = parseInt(id)
  if (!personId) return NextResponse.json({ error: 'Invalid person id' }, { status: 400 })
  try {
    const credits = await getPersonCredits(personId)
    return NextResponse.json(credits)
  } catch {
    return NextResponse.json({ error: 'Failed to load credits' }, { status: 500 })
  }
}
