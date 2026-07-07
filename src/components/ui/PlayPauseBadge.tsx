// Retro tape-reel mark — the app's logo, used in the signed-in NavBar header
// and on the signed-out auth screens (login/signup) so the branding matches
// everywhere. Built as inline SVG (not the Unicode ▶/⏏ characters — see the
// iOS gotcha in CLAUDE.md about those triggering system media controls when
// placed in interactive elements). Spins via the `.reel-mark` class in
// globals.css, which honors prefers-reduced-motion.
export default function PlayPauseBadge({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="reel-mark">
      <circle cx="20" cy="20" r="18" fill="none" stroke="var(--amber-lt)" strokeWidth="3" />
      <circle cx="20" cy="20" r="5" fill="var(--amber-lt)" />
      <g stroke="var(--amber-lt)" strokeWidth="2.5" strokeLinecap="round">
        <line x1="20" y1="4" x2="20" y2="11" />
        <line x1="20" y1="29" x2="20" y2="36" />
        <line x1="4" y1="20" x2="11" y2="20" />
        <line x1="29" y1="20" x2="36" y2="20" />
      </g>
    </svg>
  )
}
