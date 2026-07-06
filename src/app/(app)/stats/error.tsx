'use client'
import { ErrorState } from '@/components/ui/EmptyState'

// Next's error boundary for this route — catches a thrown error from the
// server component (e.g. computeStats/computeYearStats failing) and
// renders the same "SIGNAL LOST" state every other page uses on a failed
// fetch. reset() re-renders the route segment, retrying the server fetch.
export default function StatsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 0' }}>
      <ErrorState onRetry={reset} />
    </div>
  )
}
