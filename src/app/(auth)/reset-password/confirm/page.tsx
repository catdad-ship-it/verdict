'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordConfirmPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/'); router.refresh() }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-sm p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <h2 className="text-sm font-semibold tracking-widest uppercase mb-6 pb-5" style={{ color: 'var(--amber)', borderBottom: '1px solid var(--border)' }}>
          Set New Password
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--cream-dim)' }}>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 16 }}
              onFocus={e => e.target.style.borderColor = 'var(--amber)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--cream-dim)' }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 16 }}
              onFocus={e => e.target.style.borderColor = 'var(--amber)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-sm" style={{ background: 'rgba(154,48,40,0.2)', border: '1px solid var(--red)', color: '#E08070' }}>{error}</p>}
          <button type="submit" disabled={loading} className="vcr-btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
            <KeyRound size={13} />
            {loading ? 'Saving…' : 'SET PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  )
}
