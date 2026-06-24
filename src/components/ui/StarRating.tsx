'use client'

interface StarRatingProps {
  value: number
  onChange?: (v: number) => void
  readOnly?: boolean
  size?: number
}

export default function StarRating({ value, onChange, readOnly = false, size = 28 }: StarRatingProps) {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onChange?.(star)}
          disabled={readOnly}
          style={{
            background: 'none',
            border: 'none',
            cursor: readOnly ? 'default' : 'pointer',
            padding: '2px',
            fontSize: `${size}px`,
            lineHeight: 1,
            color: star <= value ? '#C07818' : '#3C3628',
            textShadow: star <= value ? '0 0 8px rgba(192,120,24,0.5)' : 'none',
            transition: 'color 0.15s, text-shadow 0.15s',
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}
