import { createClient } from '@/lib/supabase/server'

export interface StreamProvider {
  providerId:   number
  providerName: string
  logoPath:     string
}

export async function getOwnedIds(): Promise<Set<number>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Set()
    const { data } = await supabase.from('profiles').select('streaming_provider_ids').eq('id', user.id).maybeSingle()
    return new Set(data?.streaming_provider_ids ?? [])
  } catch {
    return new Set()
  }
}
