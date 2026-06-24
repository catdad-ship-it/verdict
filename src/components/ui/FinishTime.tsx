'use client'
import { Clock } from 'lucide-react'
import { calcFinishTime, formatRuntime } from '@/lib/utils'

interface Props { runtime: number }

export default function FinishTime({ runtime }: Props) {
  const ft = calcFinishTime(runtime)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Clock size={12} color="var(--amber)" />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)' }}>
        {formatRuntime(runtime)} — done by {ft.endTime}{ft.isLate ? ' (+1)' : ''}
      </span>
    </div>
  )
}
