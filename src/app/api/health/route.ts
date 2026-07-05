import { NextResponse } from 'next/server'

// Fly's health check hits this on every machine — no auth, no DB round
// trip, just confirms the Next.js server itself booted and is serving.
export async function GET() {
  return NextResponse.json({ ok: true })
}
