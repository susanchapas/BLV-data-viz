import { useMemo, useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useFilters } from '@/lib/filters'
import { useAnnounce } from '@/lib/announce'
import { evidence } from '@/lib/data'
import { buildDrillUrl } from '@/lib/drilldown'
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
      <div className="mb-6">
        <p className="section-label">01 — Evidence explorer</p>
        <h1 id="evidence-heading" className="section-heading">
          Every coded quote, searchable.
        </h1>
        <p className="body-lg">
          {sorted.length.toLocaleString()} of {evidence.length.toLocaleString()} evidence rows.
          Sort by any column, toggle column visibility, and filter from the bar above.
        </p>
        <DeviceNote total={new Set(sorted.map((r) => r.Who)).size} />
      </div>

      <div className="flex items-center justify-end mb-3">
        <details className="relative">
          <summary className="cursor-pointer text-[15px] font-bold text-action hover:underline min-h-12 flex items-center px-4 py-3 rounded-button border border-transparent hover:border-border">
            Columns
          </summary>
          <div className="absolute right-0 z-50 mt-1 bg-surface-raised border border-border-strong rounded-card shadow-lg p-3 min-w-[12rem]">
            {COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center gap-3 py-2 text-[15px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleCols.has(c.key)}
                  onChange={() => toggleCol(c.key)}
                  className="min-w-[1.125rem] min-h-[1.125rem]"
                />
                {c.label}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div
        ref={parentRef}
        className="table-wrap overflow-auto"
        style={{ height: 'calc(100vh - 20rem)' }}
        role="region"
        aria-label="Evidence table"
        tabIndex={0}
      >
        <table className="w-full text-[15px]" role="grid">
          <thead className="sticky top-0 bg-surface-sunk z-10">
            <tr className="border-b-2 border-border-strong">
              {activeColumns.map((c) => (
                <th
                  key={c.key}
                  className={`text-left px-4 py-3 font-bold text-navy-900 cursor-pointer hover:text-action ${c.width}`}
                  onClick={() => handleSort(c.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(c.key) } }}
                  aria-sort={sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  scope="col"
                  tabIndex={0}
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
                  className="hover:bg-surface-sunk border-b border-border"
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
                    <td key={c.key} className={`px-4 py-3 text-text truncate max-w-md ${c.width}`}>
                      {c.key === 'Quote' ? (
                        <QuoteCell text={String(row[c.key] ?? '')} who={row.Who} line={row.Line} />
                      ) : c.key === 'Who' ? (
                        <Link to={`/participants/${row.Who}`} className="text-action hover:underline font-mono text-xs">{row.Who}</Link>
                      ) : c.key === 'Code' ? (
                        <Link to={buildDrillUrl({ code: row.Code })} className="text-action hover:underline font-mono text-xs">{row.Code}</Link>
                      ) : c.key === 'Theme' ? (
                        <Link to={`/themes?t=${row.Theme}`} className="text-action hover:underline">{row.Theme}</Link>
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
      <blockquote className="not-italic text-text">
        {text}
        <cite className="text-xs text-text-muted ml-1 not-italic font-mono">{who} {line}</cite>
      </blockquote>
    )
  }

  return (
    <span>
      {text.slice(0, 120)}…{' '}
      <button
        onClick={() => setExpanded(true)}
        className="text-action text-xs font-bold hover:underline"
        aria-label={`Expand quote from ${who} at ${line}`}
      >
        more
      </button>
    </span>
  )
}
