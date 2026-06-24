'use client'

import React from 'react'

interface VCRButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'amber' | 'dark' | 'red' | 'forest'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  fullWidth?: boolean
}

export default function VCRButton({
  children,
  onClick,
  variant = 'amber',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
  fullWidth = false,
}: VCRButtonProps) {
  const variantStyles = {
    amber: {
      bg: '#C07818',
      shadow: '#7A4C0E',
      text: '#0D0B07',
    },
    dark: {
      bg: '#2C2820',
      shadow: '#141210',
      text: '#E4CC90',
    },
    red: {
      bg: '#9A3028',
      shadow: '#5C1C16',
      text: '#E4CC90',
    },
    forest: {
      bg: '#365A2C',
      shadow: '#1E3318',
      text: '#E4CC90',
    },
  }

  const sizeStyles = {
    sm: { padding: '4px 10px', fontSize: '11px', letterSpacing: '0.06em' },
    md: { padding: '7px 16px', fontSize: '13px', letterSpacing: '0.06em' },
    lg: { padding: '10px 24px', fontSize: '15px', letterSpacing: '0.08em' },
  }

  const v = variantStyles[variant]
  const s = sizeStyles[size]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`vcr-btn ${className}`}
      style={{
        background: disabled ? '#3C3628' : v.bg,
        color: disabled ? '#70603E' : v.text,
        padding: s.padding,
        fontSize: s.fontSize,
        letterSpacing: s.letterSpacing,
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        borderRadius: '3px',
        boxShadow: disabled
          ? 'none'
          : `0 3px 0 ${v.shadow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
        transition: 'transform 0.08s, box-shadow 0.08s',
        width: fullWidth ? '100%' : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        textTransform: 'uppercase',
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          const btn = e.currentTarget
          btn.style.transform = 'translateY(2px)'
          btn.style.boxShadow = `0 1px 0 ${v.shadow}, inset 0 1px 0 rgba(255,255,255,0.08)`
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          const btn = e.currentTarget
          btn.style.transform = ''
          btn.style.boxShadow = `0 3px 0 ${v.shadow}, inset 0 1px 0 rgba(255,255,255,0.12)`
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          const btn = e.currentTarget
          btn.style.transform = ''
          btn.style.boxShadow = `0 3px 0 ${v.shadow}, inset 0 1px 0 rgba(255,255,255,0.12)`
        }
      }}
    >
      {children}
    </button>
  )
}
