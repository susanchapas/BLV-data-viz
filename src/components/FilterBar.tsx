import { useRef, useEffect, useState, useCallback } from 'react'
import { useFilters } from '@/lib/filters'
import { useAnnounce } from '@/lib/announce'
import { themes, codebook } from '@/lib/data'

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  open,
  onToggle,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
  open: boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const set = new Set(selected)
  const allSelected = options.length > 0 && options.every((o) => set.has(o.value))

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onToggle])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="cursor-pointer px-4 py-3 border border-border-strong rounded-button text-[15px] hover:border-navy min-h-12 flex items-center gap-2"
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-action text-white rounded-pill px-2 py-0.5 text-xs font-bold">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-surface-raised border border-border-strong rounded-card shadow-lg max-h-60 overflow-y-auto min-w-[14rem]">
          <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunk cursor-pointer text-[15px] border-b border-border">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onChange(allSelected ? [] : options.map((o) => o.value))}
              className="min-w-[1.125rem] min-h-[1.125rem]"
            />
            <span className="font-semibold">{allSelected ? 'Deselect all' : 'Select all'}</span>
          </label>
          {options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunk cursor-pointer text-[15px]"
            >
              <input
                type="checkbox"
                checked={set.has(o.value)}
                onChange={() => {
                  const next = set.has(o.value)
                    ? selected.filter((v) => v !== o.value)
                    : [...selected, o.value]
                  onChange(next)
                }}
                className="min-w-[1.125rem] min-h-[1.125rem]"
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const DETECT_OPTIONS = [
  { value: 'Undetectable', label: 'Undetectable' },
  { value: 'Partly detectable', label: 'Partly detectable' },
  { value: 'Self-evident', label: 'Self-evident' },
]

const SIGNAL_STATUS_OPTIONS = [
  { value: 'Announced', label: 'Announced' },
  { value: 'Silent', label: 'Silent' },
  { value: 'Consequence', label: 'Consequence' },
]

const PARTICIPANT_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const id = `P${String(i + 1).padStart(3, '0')}`
  return { value: id, label: id }
})

export function FilterBar() {
  const { filters, updateFilter, resetFilters, activeCount } = useFilters()
  const announce = useAnnounce()
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const [localSearch, setLocalSearch] = useState(filters.search)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const toggle = useCallback((name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name))
  }, [])

  useEffect(() => {
    setLocalSearch(filters.search)
  }, [filters.search])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const themeOptions = themes.map((t) => ({
    value: t.Theme,
    label: `${t.Theme} ${t.Name}`,
  }))

  const codeOptions = codebook.map((c) => ({
    value: c.Code,
    label: `${c.Code} — ${c.Label}`,
  }))

  return (
    <div role="search" aria-label="Filters" className="border-b border-border bg-surface-sunk">
      <div className="max-w-[1240px] mx-auto flex flex-wrap gap-2.5 items-center" style={{ padding: 'clamp(10px, 2vw, 14px) clamp(20px, 4vw, 48px)' }}>
        <MultiSelect
          label="Participant"
          options={PARTICIPANT_OPTIONS}
          selected={filters.participants}
          onChange={(v) => updateFilter('participants', v)}
          open={openDropdown === 'participant'}
          onToggle={() => toggle('participant')}
        />
        <MultiSelect
          label="Theme"
          options={themeOptions}
          selected={filters.themes}
          onChange={(v) => updateFilter('themes', v)}
          open={openDropdown === 'theme'}
          onToggle={() => toggle('theme')}
        />
        <MultiSelect
          label="Code"
          options={codeOptions}
          selected={filters.codes}
          onChange={(v) => updateFilter('codes', v)}
          open={openDropdown === 'code'}
          onToggle={() => toggle('code')}
        />
        <MultiSelect
          label="Detectability"
          options={DETECT_OPTIONS}
          selected={filters.detectability}
          onChange={(v) => updateFilter('detectability', v)}
          open={openDropdown === 'detectability'}
          onToggle={() => toggle('detectability')}
        />
        <MultiSelect
          label="Signal status"
          options={SIGNAL_STATUS_OPTIONS}
          selected={filters.signalStatus}
          onChange={(v) => updateFilter('signalStatus', v)}
          open={openDropdown === 'signalStatus'}
          onToggle={() => toggle('signalStatus')}
        />
        <label className="flex items-center gap-2.5 text-[15px] min-h-12 px-4 py-3 border border-border-strong rounded-button hover:border-navy cursor-pointer">
          <input
            type="checkbox"
            checked={filters.includeP011}
            onChange={(e) => updateFilter('includeP011', e.target.checked)}
            className="min-w-[1.125rem] min-h-[1.125rem]"
          />
          Include P011
        </label>
        <div className="flex-1 min-w-[12rem]">
          <label className="sr-only" htmlFor="search-quotes">Search quotes</label>
          <input
            ref={searchRef}
            id="search-quotes"
            type="search"
            placeholder="Search quotes…"
            value={localSearch}
            onChange={(e) => {
              const v = e.target.value
              setLocalSearch(v)
              if (debounceRef.current) clearTimeout(debounceRef.current)
              debounceRef.current = setTimeout(() => {
                updateFilter('search', v)
                announce(`Search: ${v || 'cleared'}`)
              }, 300)
            }}
            className="w-full px-4 py-3 border border-border-strong rounded-button text-[15px] min-h-12 bg-surface-raised"
          />
        </div>
        {activeCount > 0 && (
          <button
            onClick={() => {
              const cleared = resetFilters()
              announce(`Cleared ${cleared} filter${cleared !== 1 ? 's' : ''}`)
            }}
            className="px-4 py-3 text-[15px] font-bold text-action hover:text-action-hover hover:underline min-h-12 rounded-button border border-transparent hover:border-border"
          >
            Clear {activeCount} filter{activeCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  )
}
