'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LogOut, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PlayPauseBadge from '@/components/ui/PlayPauseBadge'

interface NavBarProps { queueCount?: number }

export default function NavBar({ queueCount = 0 }: NavBarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY
      setHidden(current > lastScrollY.current && current > 60)
      lastScrollY.current = current
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    { href: '/',              label: 'LISTS' },
    { href: '/new-releases',  label: 'NEW RELEASES' },
    { href: '/suggestions',   label: 'SUGGESTIONS' },
    { href: '/watched',       label: 'WATCHED' },
    { href: '/stats',         label: 'STATS' },
  ]

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '3px solid var(--amber)',
      position: 'fixed',
      top: hidden ? '-150px' : 0,
      left: 0,
      right: 0,
      zIndex: 50,
      boxShadow: '0 2px 20px rgba(0,0,0,0.6)',
      transition: 'top 0.25s ease',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      <div className="flex items-center justify-between px-5 max-w-screen-xl mx-auto" style={{ height: '58px' }}>

        {/* Logo + LED counter */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-stretch">
            <div className="flex items-center px-3 py-1.5" style={{ background: 'var(--amber)' }}>
              <span className="font-black text-xl tracking-tight" style={{ color: 'var(--bg)' }}>VERDICT</span>
            </div>
            <div className="flex items-center px-2.5 py-1" style={{ background: '#1A1510', borderLeft: '2px solid var(--bg)' }}>
              <PlayPauseBadge size={26} />
            </div>
          </Link>
          {queueCount > 0 && (
            <div className="font-led text-xs px-2 py-0.5 rounded-sm hidden sm:block"
                 style={{ background: '#070604', border: '1px solid #1A1610', color: 'var(--led-orange)', textShadow: '0 0 6px var(--led-glow)' }}>
              QUEUE: {String(queueCount).padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="hidden md:block text-xs font-semibold tracking-widest uppercase px-2.5 py-2 transition-colors"
              style={{
                color: pathname === l.href ? 'var(--amber)' : 'var(--cream-dim)',
                borderBottom: pathname === l.href ? '3px solid var(--amber)' : '3px solid transparent',
                marginBottom: '-3px',
              }}>
              {l.label}
            </Link>
          ))}
          <Link href="/settings" title="Settings"
            className="flex items-center justify-center rounded-sm transition-colors"
            style={{
              width: 32, height: 32,
              color: pathname === '/settings' ? 'var(--amber)' : 'var(--cream-dim)',
            }}>
            <Settings size={16} />
          </Link>
          <div className="w-px h-5 mx-2 hidden md:block" style={{ background: 'var(--border)' }} />
          <button onClick={signOut}
            className="text-xs font-semibold tracking-widest uppercase px-2.5 py-1.5 rounded-sm transition-colors"
            style={{ color: 'var(--cream-dim)', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={13} /> OUT
          </button>
        </div>
      </div>
    </nav>
  )
}
