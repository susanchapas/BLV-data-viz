import { useState, useId, type ReactNode } from 'react'

interface ChartWrapperProps {
  title: string
  caption: string
  source: string
  altText: string
  figureLabel?: string
  deviceNote?: string
  dataTable?: ReactNode
  children: ReactNode
}

export function ChartWrapper({
  title,
  caption,
  source,
  altText,
  figureLabel,
  deviceNote,
  dataTable,
  children,
}: ChartWrapperProps) {
  const [showTable, setShowTable] = useState(false)
  const titleId = useId()
  const descId = useId()

  return (
    <figure className="card mb-8" aria-labelledby={titleId} aria-describedby={descId}>
      <figcaption className="mb-4">
        {figureLabel && (
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-action mb-2">{figureLabel}</p>
        )}
        <h2
          id={titleId}
          className="font-heading text-[22px] font-normal leading-snug text-navy-900 mb-2"
        >
          {title}
        </h2>
        <p className="text-[15px] leading-relaxed text-text-muted max-w-[62ch]">{caption}</p>
        {deviceNote && <p className="text-sm text-text-muted italic mt-1">{deviceNote}</p>}
        <p className="font-mono text-xs text-text-muted mt-2">Source: {source}</p>
      </figcaption>
      <div className="w-full">
        <span id={descId} className="sr-only">{altText}</span>
        {children}
      </div>
      {dataTable && (
        <>
          <button
            onClick={() => setShowTable(!showTable)}
            className="mt-3 text-[15px] font-bold text-action hover:text-action-hover hover:underline min-h-12 px-4 py-3 rounded-button border border-transparent hover:border-border"
            aria-expanded={showTable}
          >
            {showTable ? 'Hide data table' : 'Show data table'}
          </button>
          {showTable && <div className="mt-3 overflow-x-auto">{dataTable}</div>}
        </>
      )}
    </figure>
  )
}

export function DataTable({
  columns,
  rows,
  highlightedLabels,
  labelColumn = 0,
}: {
  columns: string[]
  rows: (string | number | null)[][]
  highlightedLabels?: string[] | null
  labelColumn?: number
}) {
  return (
    <div className="table-wrap">
      <div className="overflow-x-auto">
        <table className="text-[15px] w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b-2 border-border-strong bg-surface-sunk">
              {columns.map((c) => (
                <th key={c} scope="col" className="text-left px-4 py-3 text-sm font-bold text-navy-900">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isHighlighted = highlightedLabels?.length && highlightedLabels.includes(String(row[labelColumn]))
              return (
                <tr key={i} className={`border-b border-border hover:bg-surface-sunk ${isHighlighted ? 'bg-cornflower/10' : ''}`}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3 text-text">
                      {cell ?? '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
