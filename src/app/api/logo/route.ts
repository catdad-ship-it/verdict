import { getTitleLogo } from '@/lib/fanart'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/logo?tmdbId=123&mediaType=movie
// Backs the transparent title-logo art in TitleDetailModal. Always returns
// 200 with { logoUrl: null } rather than an error — no key configured or
// no art found are both normal, non-fatal states the UI falls back on.
export async function GET(req: NextRequest) {
  const tmdbId    = req.nextUrl.searchParams.get('tmdbId')
  const mediaType = req.nextUrl.searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie'
  if (!tmdbId) return NextResponse.json({ logoUrl: null })

  const logoUrl = await getTitleLogo(Number(tmdbId), mediaType)
  return NextResponse.json({ logoUrl })
}
