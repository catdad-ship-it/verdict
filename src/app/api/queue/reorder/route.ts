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

  const results = await Promise.all(
    order.map((id: string, index: number) =>
      supabase.from('queue_items')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )

  const failed = results.find(r => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
