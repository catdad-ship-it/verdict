import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
  async headers() {
    // script-src needs 'unsafe-inline': Next's App Router streams hydration
    // data via inline <script> tags it injects itself (self.__next_f.push
    // calls) — a strict nonce-based CSP is the "correct" fix but requires
    // generating the nonce per-request in middleware, which is more risk
    // than this app's threat model calls for. style-src needs it for the
    // same reason (all styling here is inline style={{}} objects, not
    // stylesheets). Everything else stays locked to 'self' plus the exact
    // third-party hosts actually in use.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://image.tmdb.org https://*.fanart.tv data:",
      "font-src 'self' data:",
      "frame-src https://www.youtube.com",
      "connect-src 'self' https://xdwitnnqkzxhrboczjdu.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy',    value: csp },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
