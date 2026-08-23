import { useState, useId, type ReactNode } from 'react'

interface ChartWrapperProps {
  title: string
  caption: string
  source: string
  altText: string
  deviceNote?: string
  dataTable?: ReactNode
  children: ReactNode
}

export function ChartWrapper({
  title,
  caption,
  source,
  altText,
  deviceNote,
  dataTable,
  children,
}: ChartWrapperProps) {
  const [showTable, setShowTable] = useState(false)
  const titleId = useId()
  const descId = useId()

  return (
    <figure className="mb-8">
      <figcaption className="mb-2">
        <h2 id={titleId} className="text-base font-semibold text-grey-5">
          {title}
        </h2>
        <p className="text-sm text-grey-4">{caption}</p>
        {deviceNote && <p className="text-sm text-grey-3 italic">{deviceNote}</p>}
        <p className="text-xs text-grey-3 mt-1">Source: {source}</p>
      </figcaption>
      <div
        role="figure"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full"
      >
        <span id={descId} className="sr-only">{altText}</span>
        {children}
      </div>
      {dataTable && (
        <>
          <button
            onClick={() => setShowTable(!showTable)}
            className="mt-2 text-sm text-accent hover:underline min-h-[2.75rem] min-w-[2.75rem]"
            aria-expanded={showTable}
          >
            {showTable ? 'Hide data table' : 'Show data table'}
          </button>
          {showTable && <div className="mt-2 overflow-x-auto">{dataTable}</div>}
        </>
      )}
    </figure>
  )
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: (string | number | null)[][]
}) {
  return (
    <table className="text-sm border-collapse w-full">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col" className="text-left px-2 py-1 border-b border-grey-2 font-medium text-grey-4">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="hover:bg-grey-0">
            {row.map((cell, j) => (
              <td key={j} className="px-2 py-1 border-b border-grey-1 text-grey-5">
                {cell ?? '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
