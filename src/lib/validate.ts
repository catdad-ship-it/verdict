import { NextResponse } from 'next/server'

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function isIntInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}
