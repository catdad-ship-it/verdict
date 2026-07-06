import { getOwnedIds, fetchProviders } from '@/lib/providers'
import { badRequest } from '@/lib/validate'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/providers?tmdbId=123&mediaType=movie
export async function GET(req: NextRequest) {
  const tmdbId    = req.nextUrl.searchParams.get('tmdbId')
  const mediaType = req.nextUrl.searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie'
  if (!tmdbId) return badRequest('tmdbId is required')

  const ownedIds = await getOwnedIds()
  const result = await fetchProviders(Number(tmdbId), mediaType, ownedIds)
  return NextResponse.json(result)
}
