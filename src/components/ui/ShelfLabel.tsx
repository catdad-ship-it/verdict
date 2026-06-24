interface ShelfLabelProps {
  children: React.ReactNode
  className?: string
}

export default function ShelfLabel({ children, className = '' }: ShelfLabelProps) {
  return (
    <h2
      className={`shelf-label text-xl md:text-2xl ${className}`}
      style={{
        fontFamily: "'Bungee', cursive",
        color: 'var(--amber)',
        borderLeft: '4px solid var(--amber)',
        paddingLeft: '12px',
        lineHeight: 1.1,
      }}
    >
      {children}
    </h2>
  )
}
