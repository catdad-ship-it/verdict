'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface LEDDisplayProps {
  showClock?: boolean
  label?: string
  value?: string
  className?: string
}

export default function LEDDisplay({ showClock = false, label, value, className = '' }: LEDDisplayProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    if (!showClock) return
    const update = () => setTime(format(new Date(), 'hh:mm:ss'))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [showClock])

  return (
    <div
      className={`led px-3 py-1.5 rounded text-sm ${className}`}
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        color: '#FF5500',
        textShadow: '0 0 8px rgba(255,85,0,0.5)',
        background: '#080604',
        border: '1px solid #1a1208',
        letterSpacing: '0.1em',
      }}
    >
      {showClock && <span>{time || '--:--:--'}</span>}
      {label && <span style={{ color: '#804000', marginRight: '8px' }}>{label}:</span>}
      {value && <span>{value}</span>}
    </div>
  )
}
