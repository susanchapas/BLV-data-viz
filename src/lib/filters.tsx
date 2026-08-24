import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import type { FilterState, EvidenceRow } from './types'
import { EMPTY_FILTERS } from './types'
import { isP011 } from './constants'

function parseFilters(params: URLSearchParams): FilterState {
  return {
    participants: params.getAll('p'),
    themes: params.getAll('t'),
    codes: params.getAll('c'),
    detectability: params.getAll('det'),
    failureClass: params.getAll('fc'),
    signalStatus: params.getAll('ss'),
    visionStatus: params.getAll('vs'),
    search: params.get('q') ?? '',
    includeP011: params.get('p011') === '1',
  }
}

function serializeFilters(f: FilterState): URLSearchParams {
  const p = new URLSearchParams()
  f.participants.forEach((v) => p.append('p', v))
  f.themes.forEach((v) => p.append('t', v))
  f.codes.forEach((v) => p.append('c', v))
  f.detectability.forEach((v) => p.append('det', v))
  f.failureClass.forEach((v) => p.append('fc', v))
  f.signalStatus.forEach((v) => p.append('ss', v))
  f.visionStatus.forEach((v) => p.append('vs', v))
  if (f.search) p.set('q', f.search)
  if (f.includeP011) p.set('p011', '1')
  return p
}

export function countActiveFilters(f: FilterState): number {
  let n = 0
  if (f.participants.length) n++
  if (f.themes.length) n++
  if (f.codes.length) n++
  if (f.detectability.length) n++
  if (f.failureClass.length) n++
  if (f.signalStatus.length) n++
  if (f.visionStatus.length) n++
  if (f.search) n++
  return n
}

interface FilterContextValue {
  filters: FilterState
  setFilters: (f: FilterState) => void
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  toggleArrayFilter: (key: keyof FilterState, value: string) => void
  resetFilters: () => number
  filterEvidence: (rows: EvidenceRow[]) => EvidenceRow[]
  activeCount: number
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => parseFilters(searchParams), [searchParams])

  const setFilters = useCallback(
    (f: FilterState) => setSearchParams(serializeFilters(f), { replace: true }),
    [setSearchParams],
  )

  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      const next = { ...filters, [key]: value }
      setFilters(next)
    },
    [filters, setFilters],
  )

  const toggleArrayFilter = useCallback(
    (key: keyof FilterState, value: string) => {
      const arr = filters[key]
      if (!Array.isArray(arr)) return
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value]
      updateFilter(key, next as FilterState[typeof key])
    },
    [filters, updateFilter],
  )

  const resetFilters = useCallback(() => {
    const count = countActiveFilters(filters)
    setFilters(EMPTY_FILTERS)
    return count
  }, [filters, setFilters])

  const filterEvidence = useCallback(
    (rows: EvidenceRow[]): EvidenceRow[] => {
      let result = rows
      if (!filters.includeP011) {
        result = result.filter((r) => !isP011(r.Who))
      }
      if (filters.participants.length) {
        const set = new Set(filters.participants)
        result = result.filter((r) => set.has(r.Who))
      }
      if (filters.themes.length) {
        const set = new Set(filters.themes)
        result = result.filter((r) => set.has(r.Theme))
      }
      if (filters.codes.length) {
        const set = new Set(filters.codes)
        result = result.filter((r) => set.has(r.Code))
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        result = result.filter(
          (r) =>
            r.Quote?.toLowerCase().includes(q) ||
            r['Label as coded']?.toLowerCase().includes(q) ||
            r.Code?.toLowerCase().includes(q) ||
            r['Theme name']?.toLowerCase().includes(q) ||
            r['Sub-theme']?.toLowerCase().includes(q),
        )
      }
      return result
    },
    [filters],
  )

  const activeCount = useMemo(() => countActiveFilters(filters), [filters])

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      updateFilter,
      toggleArrayFilter,
      resetFilters,
      filterEvidence,
      activeCount,
    }),
    [filters, setFilters, updateFilter, toggleArrayFilter, resetFilters, filterEvidence, activeCount],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within FilterProvider')
  return ctx
}
