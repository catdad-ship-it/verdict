'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PlayPauseBadge from '@/components/ui/PlayPauseBadge'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="relative w-full max-w-sm">
      {/* Ambient glow */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full"
           style={{ background: 'radial-gradient(ellipse, rgba(192,120,24,0.07), transparent 65%)' }} />

      {/* Logo — same lockup as the signed-in NavBar, so branding matches before and after sign-in */}
      <div className="flex justify-center mb-10">
        <div className="flex items-stretch">
          <div className="px-4 py-2 flex items-center" style={{ background: 'var(--amber)' }}>
            <span className="font-black text-4xl tracking-tight" style={{ color: 'var(--bg)', fontFamily: 'var(--font-inter)' }}>VERDICT</span>
          </div>
          <div className="px-3 py-2 flex items-center" style={{ background: '#1A1510', borderLeft: '2px solid var(--bg)' }}>
            <PlayPauseBadge size={32} />
          </div>
        </div>
      </div>
      <p className="text-center text-xs tracking-widest uppercase mb-8" style={{ color: 'var(--cream-dim)', fontFamily: 'monospace' }}>
        YOUR PERSONAL VIDEO STORE
      </p>

      {/* Card */}
      <div className="rounded-sm p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: 'var(--amber)' }}>
            Member Sign In
          </h2>
          <div className="font-led text-xs px-2 py-1 rounded-sm"
               style={{ background: '#070604', border: '1px solid #1A1610', color: 'var(--led-orange)', textShadow: '0 0 6px var(--led-glow)' }}>
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--cream-dim)' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="your@email.com"
              className="w-full px-3 py-2.5 rounded-sm outline-none transition-colors"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 16 }}
              onFocus={e => e.target.style.borderColor = 'var(--amber)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--cream-dim)' }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-sm outline-none transition-colors"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 16 }}
              onFocus={e => e.target.style.borderColor = 'var(--amber)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-sm" style={{ background: 'rgba(154,48,40,0.2)', border: '1px solid var(--red)', color: '#E08070' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="vcr-btn-primary w-full py-3 text-sm mt-2 flex items-center justify-center gap-2">
            <Play size={13} fill="currentColor" />
            {loading ? 'Signing in…' : 'PLAY'}
          </button>
        </form>

        <div className="flex justify-center gap-5 mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Link href="/reset-password" className="text-xs transition-colors" style={{ color: 'var(--cream-dim)' }}
            onMouseOver={e => (e.target as HTMLElement).style.color = 'var(--amber)'}
            onMouseOut={e => (e.target as HTMLElement).style.color = 'var(--cream-dim)'}>
            Forgot password?
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <Link href="/signup" className="text-xs transition-colors" style={{ color: 'var(--cream-dim)' }}
            onMouseOver={e => (e.target as HTMLElement).style.color = 'var(--amber)'}
            onMouseOut={e => (e.target as HTMLElement).style.color = 'var(--cream-dim)'}>
            New member
          </Link>
        </div>
      </div>

      <p className="text-center mt-8 text-xs tracking-widest" style={{ color: 'var(--very-muted)', fontFamily: 'monospace' }}>
        BE KIND, REWIND.
      </p>
    </div>
  )
}
