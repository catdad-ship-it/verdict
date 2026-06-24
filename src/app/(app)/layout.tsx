import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/ui/NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get queue count for LED display
  const { count } = await supabase
    .from('queue_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <div className="min-h-screen">
      <NavBar queueCount={count ?? 0} />
      <main className="max-w-screen-xl mx-auto px-5 py-8">
        {children}
      </main>
    </div>
  )
}
