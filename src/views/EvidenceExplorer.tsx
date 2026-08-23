import { useMemo, useState, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useFilters } from '@/lib/filters'
import { useAnnounce } from '@/lib/announce'
import { evidence } from '@/lib/data'
import { DeviceNote } from '@/components/DeviceNote'
import type { EvidenceRow } from '@/lib/types'

type SortKey = keyof EvidenceRow
type SortDir = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string; width: string }[] = [
  { key: '#', label: '#', width: 'w-16' },
  { key: 'Who', label: 'Who', width: 'w-16' },
  { key: 'Theme', label: 'Theme', width: 'w-14' },
  { key: 'Sub-theme', label: 'Sub-theme', width: 'w-48' },
  { key: 'Code', label: 'Code', width: 'w-40' },
  { key: 'Quote', label: 'Quote', width: 'flex-1' },
  { key: 'Line', label: 'Line', width: 'w-14' },
]

const VISIBLE_COLS_DEFAULT = new Set<SortKey>(['#', 'Who', 'Code', 'Quote', 'Line'])

export function EvidenceExplorer() {
  const { filterEvidence, filters } = useFilters()
  const announce = useAnnounce()
  const [sortKey, setSortKey] = useState<SortKey>('#')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [visibleCols, setVisibleCols] = useState(VISIBLE_COLS_DEFAULT)
  const parentRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => filterEvidence(evidence), [filterEvidence])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 20,
  })

  const prevCountRef = useRef(sorted.length)
  useEffect(() => {
    if (prevCountRef.current !== sorted.length) {
      const p011Note = filters.includeP011 ? '' : ', P011 excluded'
      announce(`Filtered to ${sorted.length} evidence rows${p011Note}`)
      prevCountRef.current = sorted.length
    }
  }, [sorted.length, filters.includeP011, announce])

  const activeColumns = COLUMNS.filter((c) => visibleCols.has(c.key))

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function toggleCol(key: SortKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <section aria-labelledby="evidence-heading">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h1 id="evidence-heading" className="text-xl font-semibold text-grey-5">
            Evidence explorer
          </h1>
          <p className="text-sm text-grey-4">
            {sorted.length.toLocaleString()} of {evidence.length.toLocaleString()} rows
          </p>
          <DeviceNote total={new Set(sorted.map((r) => r.Who)).size} />
        </div>
        <details className="relative">
          <summary className="cursor-pointer text-sm text-accent hover:underline min-h-[2.75rem] flex items-center">
            Columns
          </summary>
          <div className="absolute right-0 z-50 mt-1 bg-white border border-grey-2 rounded shadow-lg p-2 min-w-[10rem]">
            {COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleCols.has(c.key)}
                  onChange={() => toggleCol(c.key)}
                  className="min-w-[1rem] min-h-[1rem]"
                />
                {c.label}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div
        ref={parentRef}
        className="border border-grey-1 rounded overflow-auto"
        style={{ height: 'calc(100vh - 14rem)' }}
        role="region"
        aria-label="Evidence table"
        tabIndex={0}
      >
        <table className="w-full text-sm" role="grid">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              {activeColumns.map((c) => (
                <th
                  key={c.key}
                  className={`text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4 cursor-pointer hover:text-grey-5 ${c.width}`}
                  onClick={() => handleSort(c.key)}
                  aria-sort={sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  scope="col"
                >
                  {c.label}
                  {sortKey === c.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const row = sorted[vi.index]
              return (
                <tr
                  key={vi.key}
                  className="hover:bg-grey-0"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: vi.size,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  {activeColumns.map((c) => (
                    <td key={c.key} className={`px-2 py-1.5 text-grey-5 truncate max-w-md ${c.width}`}>
                      {c.key === 'Quote' ? (
                        <QuoteCell text={String(row[c.key] ?? '')} who={row.Who} line={row.Line} />
                      ) : (
                        String(row[c.key] ?? '')
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function QuoteCell({ text, who, line }: { text: string; who: string; line: string }) {
  const [expanded, setExpanded] = useState(false)
  const truncated = text.length > 120

  if (!truncated || expanded) {
    return (
      <blockquote className="not-italic text-grey-5">
        {text}
        <cite className="text-xs text-grey-3 ml-1 not-italic">{who} {line}</cite>
      </blockquote>
    )
  }

  return (
    <span>
      {text.slice(0, 120)}…{' '}
      <button
        onClick={() => setExpanded(true)}
        className="text-accent text-xs hover:underline"
        aria-label={`Expand quote from ${who} at ${line}`}
      >
        more
      </button>
    </span>
  )
}
