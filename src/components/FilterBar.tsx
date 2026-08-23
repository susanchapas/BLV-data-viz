import { useRef, useEffect, useState } from 'react'
import { useFilters } from '@/lib/filters'
import { useAnnounce } from '@/lib/announce'
import { themes, codebook } from '@/lib/data'

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const set = new Set(selected)
  return (
    <details className="relative">
      <summary className="cursor-pointer px-3 py-1.5 border border-grey-2 rounded text-sm hover:border-grey-4 min-h-[2.75rem] flex items-center">
        {label}
        {selected.length > 0 && (
          <span className="ml-1.5 bg-accent text-white rounded-full px-1.5 text-xs">
            {selected.length}
          </span>
        )}
      </summary>
      <div className="absolute z-50 mt-1 bg-white border border-grey-2 rounded shadow-lg max-h-60 overflow-y-auto min-w-[14rem]">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-grey-0 cursor-pointer text-sm"
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
              className="min-w-[1rem] min-h-[1rem]"
            />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
      </div>
    </details>
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
    <div role="search" aria-label="Filters" className="flex flex-wrap gap-2 items-center py-3 px-4 bg-grey-0 border-b border-grey-1">
      <MultiSelect
        label="Participant"
        options={PARTICIPANT_OPTIONS}
        selected={filters.participants}
        onChange={(v) => updateFilter('participants', v)}
      />
      <MultiSelect
        label="Theme"
        options={themeOptions}
        selected={filters.themes}
        onChange={(v) => updateFilter('themes', v)}
      />
      <MultiSelect
        label="Code"
        options={codeOptions}
        selected={filters.codes}
        onChange={(v) => updateFilter('codes', v)}
      />
      <MultiSelect
        label="Detectability"
        options={DETECT_OPTIONS}
        selected={filters.detectability}
        onChange={(v) => updateFilter('detectability', v)}
      />
      <MultiSelect
        label="Signal status"
        options={SIGNAL_STATUS_OPTIONS}
        selected={filters.signalStatus}
        onChange={(v) => updateFilter('signalStatus', v)}
      />
      <label className="flex items-center gap-1.5 text-sm min-h-[2.75rem]">
        <input
          type="checkbox"
          checked={filters.includeP011}
          onChange={(e) => updateFilter('includeP011', e.target.checked)}
          className="min-w-[1rem] min-h-[1rem]"
        />
        Include P011 (EchoVision)
      </label>
      <div className="flex-1 min-w-[10rem]">
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
          className="w-full px-3 py-1.5 border border-grey-2 rounded text-sm min-h-[2.75rem]"
        />
      </div>
      {activeCount > 0 && (
        <button
          onClick={() => {
            const cleared = resetFilters()
            announce(`Cleared ${cleared} filter${cleared !== 1 ? 's' : ''}`)
          }}
          className="px-3 py-1.5 text-sm text-accent hover:underline min-h-[2.75rem]"
        >
          Clear {activeCount} filter{activeCount !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
