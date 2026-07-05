'use client'
import { useState, useCallback } from 'react'

// Generic multi-select Set<T> bookkeeping — toggle mode + the select-all
// bulk-action-bar flow are handled at the page level (Watched needs two of
// these, one per tab, sharing a single selectMode), only the actual
// selection Set itself was duplicated.
export function useBulkSelect<T>() {
  const [selected, setSelected] = useState<Set<T>>(new Set())

  const toggle = useCallback((key: T) => {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAll = useCallback((keys: T[]) => setSelected(new Set(keys)), [])
  const clear = useCallback(() => setSelected(new Set()), [])

  return { selected, toggle, selectAll, clear }
}
