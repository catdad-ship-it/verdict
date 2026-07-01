import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/ui/NavBar'
import BottomNav from '@/components/ui/BottomNav'
import { ToastProvider } from '@/components/ui/Toast'
import UpNextBar from '@/components/ui/UpNextBar'

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
    <ToastProvider>
      <div className="min-h-screen">
        <NavBar queueCount={count ?? 0} />
        <div style={{ height: 'calc(58px + env(safe-area-inset-top))' }} />
        <main className="max-w-screen-xl mx-auto px-5 pt-8 pb-36 md:pb-8">
          {children}
        </main>
        <BottomNav />
        <UpNextBar />
      </div>
    </ToastProvider>
  )
}
