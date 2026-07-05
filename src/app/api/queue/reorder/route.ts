import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/queue/reorder — body: { order: string[] } (queue_items.id, in the
// user's new desired order). Assigns sequential sort_order values so the
// dragged arrangement persists across reloads. Fire-and-forget from the
// client; not destructive, so no undo affordance needed.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order } = await req.json()
  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: 'order must be a non-empty array' }, { status: 400 })
  }

  // One statement instead of one UPDATE round-trip per dragged row — see
  // reorder_queue_items in supabase/migrations. Scoped to the caller's own
  // rows inside the function itself (auth.uid() = user_id).
  const { error } = await supabase.rpc('reorder_queue_items', {
    p_ids: order,
    p_positions: order.map((_: string, index: number) => index),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
