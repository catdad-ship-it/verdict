import { createClient } from '@/lib/supabase/server'
import { computeYearStats } from '@/lib/stats'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const yearStats = await computeYearStats(supabase, user.id)
  return NextResponse.json(yearStats)
}
