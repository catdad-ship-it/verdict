// Retro VCR play/pause badge — the app's logo mark, used in the signed-in
// NavBar header and on the signed-out auth screens (login/signup) so the
// branding matches everywhere. Built as inline SVG (not the Unicode ▶/⏏
// characters — see the iOS gotcha in CLAUDE.md about those triggering
// system media controls when placed in interactive elements).
export default function PlayPauseBadge({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" fill="#171009" stroke="var(--amber)" strokeWidth="2" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <path d="M9,11 L9,29 L20,20 Z" fill="var(--cream)" />
      <rect x="22.5" y="10.5" width="3.6" height="19" rx="0.8" fill="var(--cream)" />
      <rect x="28" y="10.5" width="3.6" height="19" rx="0.8" fill="var(--cream)" />
    </svg>
  )
}
