export interface FinishTime {
  endTime: string    // "11:28 PM"
  duration: string   // "2h 28m"
  isLate: boolean    // past midnight
  isWeeknight: boolean
}

export function calcFinishTime(runtimeMinutes: number, startDate?: Date): FinishTime {
  const now = startDate ?? new Date()
  const end = new Date(now.getTime() + runtimeMinutes * 60 * 1000)

  const hours = end.getHours()
  const mins  = end.getMinutes()
  const ampm  = hours >= 12 ? 'PM' : 'AM'
  const h12   = hours % 12 || 12
  const endTime = `${h12}:${String(mins).padStart(2, '0')} ${ampm}`

  const h = Math.floor(runtimeMinutes / 60)
  const m = runtimeMinutes % 60
  const duration = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`

  const day = now.getDay()  // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 5 || day === 6
  const isWeeknight = !isWeekend

  return {
    endTime,
    duration,
    isLate: end.getDate() !== now.getDate(),
    isWeeknight,
  }
}

export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
}
