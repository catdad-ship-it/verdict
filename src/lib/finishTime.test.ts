import { describe, it, expect } from 'vitest'
import { calcFinishTime, formatRuntime } from './finishTime'

describe('formatRuntime', () => {
  it('formats hours and minutes', () => {
    expect(formatRuntime(150)).toBe('2h 30m')
  })

  it('omits minutes when exactly on the hour', () => {
    expect(formatRuntime(120)).toBe('2h')
  })

  it('formats under an hour as minutes only', () => {
    expect(formatRuntime(45)).toBe('45m')
  })

  it('formats zero minutes', () => {
    expect(formatRuntime(0)).toBe('0m')
  })
})

describe('calcFinishTime', () => {
  it('computes the end time and duration for a same-day finish', () => {
    const start = new Date('2026-01-06T19:00:00') // Tuesday 7:00 PM
    const result = calcFinishTime(90, start)
    expect(result.endTime).toBe('8:30 PM')
    expect(result.duration).toBe('1h 30m')
    expect(result.isLate).toBe(false)
  })

  it('flags isLate when the finish crosses midnight', () => {
    const start = new Date('2026-01-06T23:30:00')
    const result = calcFinishTime(60, start)
    expect(result.isLate).toBe(true)
  })

  it('treats Friday/Saturday/Sunday as not a weeknight', () => {
    const friday = new Date('2026-01-09T19:00:00')
    expect(calcFinishTime(30, friday).isWeeknight).toBe(false)
  })

  it('treats Monday-Thursday as a weeknight', () => {
    const monday = new Date('2026-01-05T19:00:00')
    expect(calcFinishTime(30, monday).isWeeknight).toBe(true)
  })
})
