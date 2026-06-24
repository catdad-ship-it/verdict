import { getShow } from '@/lib/tmdb'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const show = await getShow(Number(params.id))
  if (!show) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(show)
}
