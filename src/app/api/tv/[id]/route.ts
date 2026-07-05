import { getShow } from '@/lib/tmdb'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const show = await getShow(Number(id))
    return NextResponse.json(show)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
