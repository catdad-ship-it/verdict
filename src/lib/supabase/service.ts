import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Server-only — bypasses RLS. Never import on the client.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
