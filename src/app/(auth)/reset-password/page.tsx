'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail]     = useState('')
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  if (done) return (
    <div className="w-full max-w-sm text-center">
      <div className="rounded-sm p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-lg mb-3" style={{ color: 'var(--amber)' }}>Check your email</p>
        <p className="text-sm mb-6" style={{ color: 'var(--cream-dim)' }}>We sent a reset link to {email}</p>
        <Link href="/login" className="text-xs" style={{ color: 'var(--cream-dim)' }}>← Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-sm p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <h2 className="text-sm font-semibold tracking-widest uppercase mb-6 pb-5" style={{ color: 'var(--amber)', borderBottom: '1px solid var(--border)' }}>
          Reset Password
        </h2>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--cream-dim)' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
              className="w-full px-3 py-2.5 rounded-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 16 }}
              onFocus={e => e.target.style.borderColor = 'var(--amber)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-sm" style={{ background: 'rgba(154,48,40,0.2)', border: '1px solid var(--red)', color: '#E08070' }}>{error}</p>}
          <button type="submit" disabled={loading} className="vcr-btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
            <Mail size={13} />
            {loading ? 'Sending…' : 'SEND RESET LINK'}
          </button>
        </form>
        <div className="text-center mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Link href="/login" className="text-xs" style={{ color: 'var(--cream-dim)' }}>← Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
