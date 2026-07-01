'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PlayPauseBadge from '@/components/ui/PlayPauseBadge'

export default function SignupPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  if (done) return (
    <div className="w-full max-w-sm text-center">
      <div className="flex justify-center mb-8">
        <div className="flex items-stretch">
          <div className="px-4 py-2 flex items-center" style={{ background: 'var(--amber)' }}>
            <span className="font-black text-3xl tracking-tight" style={{ color: 'var(--bg)' }}>VERDICT</span>
          </div>
          <div className="px-3 py-2 flex items-center" style={{ background: '#1A1510', borderLeft: '2px solid var(--bg)' }}>
            <PlayPauseBadge size={28} />
          </div>
        </div>
      </div>
      <div className="rounded-sm p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-2xl mb-3" style={{ color: 'var(--amber)' }}>Membership Created</p>
        <p className="text-sm mb-6" style={{ color: 'var(--cream-dim)' }}>Check your email to confirm your account, then sign in.</p>
        <Link href="/login" className="vcr-btn-primary inline-block px-6 py-2.5 text-sm">SIGN IN →</Link>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-sm">
      <div className="flex justify-center mb-10">
        <div className="flex items-stretch">
          <div className="px-4 py-2 flex items-center" style={{ background: 'var(--amber)' }}>
            <span className="font-black text-4xl tracking-tight" style={{ color: 'var(--bg)' }}>VERDICT</span>
          </div>
          <div className="px-3 py-2 flex items-center" style={{ background: '#1A1510', borderLeft: '2px solid var(--bg)' }}>
            <PlayPauseBadge size={32} />
          </div>
        </div>
      </div>

      <div className="rounded-sm p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <h2 className="text-sm font-semibold tracking-widest uppercase mb-6 pb-5" style={{ color: 'var(--amber)', borderBottom: '1px solid var(--border)' }}>
          New Membership
        </h2>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--cream-dim)' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
              className="w-full px-3 py-2.5 rounded-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 16 }}
              onFocus={e => e.target.style.borderColor = 'var(--amber)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--cream-dim)' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters"
              className="w-full px-3 py-2.5 rounded-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 16 }}
              onFocus={e => e.target.style.borderColor = 'var(--amber)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-sm" style={{ background: 'rgba(154,48,40,0.2)', border: '1px solid var(--red)', color: '#E08070' }}>{error}</p>}
          <button type="submit" disabled={loading} className="vcr-btn-primary w-full py-3 text-sm mt-2 flex items-center justify-center gap-2">
            <Play size={13} fill="currentColor" />
            {loading ? 'Creating…' : 'CREATE ACCOUNT'}
          </button>
        </form>
        <div className="text-center mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Link href="/login" className="text-xs" style={{ color: 'var(--cream-dim)' }}>Already a member? Sign in</Link>
        </div>
      </div>
    </div>
  )
}
