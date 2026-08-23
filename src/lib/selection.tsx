import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

interface SelectionState {
  labels: string[]
  source: string | null
}

interface SelectionContextValue {
  selection: SelectionState
  setSelection: (labels: string[], source: string) => void
  clearSelection: () => void
}

const EMPTY: SelectionState = { labels: [], source: null }
const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelectionState] = useState<SelectionState>(EMPTY)

  const setSelection = useCallback((labels: string[], source: string) => {
    setSelectionState({ labels, source })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionState(EMPTY)
  }, [])

  const value = useMemo(() => ({ selection, setSelection, clearSelection }), [selection, setSelection, clearSelection])

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export function useSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider')
  return ctx
}
