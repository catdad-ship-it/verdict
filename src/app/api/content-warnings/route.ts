import { getContentWarnings } from '@/lib/dtdd'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/content-warnings?tmdbId=123&mediaType=movie
// Backs the "Content notes" section in TitleDetailModal. Always 200 with
// an empty array when unconfigured or no data — this is optional color,
// never something that should block or error the modal.
export async function GET(req: NextRequest) {
  const tmdbId    = req.nextUrl.searchParams.get('tmdbId')
  const mediaType = req.nextUrl.searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie'
  if (!tmdbId) return NextResponse.json({ warnings: [] })

  const warnings = await getContentWarnings(Number(tmdbId), mediaType)
  return NextResponse.json({ warnings })
}
