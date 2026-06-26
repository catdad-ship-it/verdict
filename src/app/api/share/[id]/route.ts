import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/share/[id] — public, no auth required
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: list }, { data: items }] = await Promise.all([
    supabase.from('lists').select('id, name, user_id').eq('id', id).single(),
    supabase.from('list_items').select('*').eq('list_id', id).order('added_at', { ascending: false }),
  ])

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  return NextResponse.json({ list, items: items ?? [] })
}
