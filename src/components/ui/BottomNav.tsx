'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Film, Lightbulb, Eye } from 'lucide-react'

const tabs = [
  { href: '/',             label: 'QUEUE',   Icon: Home      },
  { href: '/new-releases', label: 'NEW',     Icon: Film      },
  { href: '/suggestions',  label: 'IDEAS',   Icon: Lightbulb },
  { href: '/watched',      label: 'WATCHED', Icon: Eye       },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        background: 'var(--surface)',
        borderTop: '2px solid var(--amber)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
            style={{
              color: active ? 'var(--amber)' : 'var(--muted)',
              borderTop: `2px solid ${active ? 'var(--amber)' : 'transparent'}`,
              marginTop: '-2px',
              textDecoration: 'none',
            }}
          >
            <Icon size={28} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
              lineHeight: 1,
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
