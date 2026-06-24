import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Verdict ▶',
  description: 'Your personal video store',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* CRT scanlines — z-index 9000, below FAB at 9001 */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000,
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
        }} />
        {/* CRT vignette — z-index 8999 */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 8999,
          background: 'radial-gradient(ellipse 100% 90% at 50% 50%, transparent 45%, rgba(0,0,0,0.28) 78%, rgba(0,0,0,0.6) 100%)',
        }} />
        {children}
      </body>
    </html>
  )
}
