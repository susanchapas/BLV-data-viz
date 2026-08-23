import { useState, useMemo } from 'react'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { datasets, CHART_TYPES, type ChartType, type DatasetEntry } from '@/lib/datasets'
import { BarChart, PieChart, StackedBarChart, ClusteredBarChart, ScatterPlot, HeatMap, TreeMap } from '@/charts'
import type { BarDatum, StackedDatum, ScatterDatum, HeatCell } from '@/charts'

type Agg = 'sum' | 'count' | 'avg'

function numericCols(ds: DatasetEntry) {
  return ds.columns.filter(c => c.type === 'numeric')
}

function catCols(ds: DatasetEntry) {
  return ds.columns.filter(c => c.type === 'categorical')
}

function pidCols(ds: DatasetEntry) {
  return ds.columns.filter(c => c.type === 'participant')
}

function aggregate(rows: Record<string, unknown>[], labelCol: string, valueCol: string | null, agg: Agg): BarDatum[] {
  const groups = new Map<string, number[]>()
  for (const row of rows) {
    const key = String(row[labelCol] ?? 'Unknown')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(valueCol ? (Number(row[valueCol]) || 0) : 1)
  }
  return Array.from(groups.entries())
    .map(([label, vals]) => ({
      label,
      value: agg === 'count' ? vals.length : agg === 'avg' ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : vals.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.value - a.value)
}

function aggregateGrouped(rows: Record<string, unknown>[], labelCol: string, valueCol: string | null, groupCol: string, agg: Agg): StackedDatum[] {
  const map = new Map<string, Map<string, number[]>>()
  for (const row of rows) {
    const label = String(row[labelCol] ?? 'Unknown')
    const group = String(row[groupCol] ?? 'Unknown')
    if (!map.has(label)) map.set(label, new Map())
    const gm = map.get(label)!
    if (!gm.has(group)) gm.set(group, [])
    gm.get(group)!.push(valueCol ? (Number(row[valueCol]) || 0) : 1)
  }
  return Array.from(map.entries())
    .map(([label, gm]) => ({
      label,
      segments: Array.from(gm.entries()).map(([key, vals]) => ({
        key,
        value: agg === 'count' ? vals.length : agg === 'avg' ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : vals.reduce((a, b) => a + b, 0),
      })),
    }))
    .sort((a, b) => b.segments.reduce((s, seg) => s + seg.value, 0) - a.segments.reduce((s, seg) => s + seg.value, 0))
}

function buildParticipantHeatmap(rows: Record<string, unknown>[], labelCol: string, pids: string[]): HeatCell[] {
  const cells: HeatCell[] = []
  for (const row of rows) {
    const label = String(row[labelCol] ?? '')
    for (const pid of pids) {
      const val = Number(row[pid]) || 0
      if (val > 0) cells.push({ row: label, col: pid, value: val })
    }
  }
  return cells
}

function pickDefaults(ds: DatasetEntry): { labelCol: string; valueCol: string; groupCol: string; chartType: ChartType } {
  const cats = catCols(ds)
  const nums = numericCols(ds)
  const pids = pidCols(ds)

  const labelCol = cats[0]?.name ?? ds.columns[0]?.name ?? ''

  const excludeNames = new Set(['#', 'Total', 'Rows (n=17)', 'Participants (n=17)', 'Coded quotes', 'Sub-themes'])
  const goodNum = nums.find(c => !excludeNames.has(c.name)) ?? nums[0]
  const valueCol = goodNum?.name ?? ''

  const groupCol = cats.length > 1 ? cats[1].name : ''

  let chartType: ChartType = 'bar'
  if (pids.length > 0 && nums.length === 0) chartType = 'heatmap'
  else if (nums.length >= 2 && ds.rows.length <= 50) chartType = 'scatter'

  return { labelCol, valueCol, groupCol, chartType }
}

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-xs tracking-[0.06em] uppercase text-text-muted">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-[15px] border border-border-strong rounded-button px-4 py-3 bg-surface-raised text-text min-h-12"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

export function DataExplorer() {
  const [ref, width] = useContainerWidth()
  const [dsKey, setDsKey] = useState(datasets[0].key)
  const ds = datasets.find(d => d.key === dsKey)!

  const defaults = useMemo(() => pickDefaults(ds), [ds])
  const [chartType, setChartType] = useState<ChartType>(defaults.chartType)
  const [labelCol, setLabelCol] = useState(defaults.labelCol)
  const [valueCol, setValueCol] = useState(defaults.valueCol)
  const [groupCol, setGroupCol] = useState(defaults.groupCol)
  const [agg, setAgg] = useState<Agg>('sum')
  const [showTable, setShowTable] = useState(false)
  const [limit, setLimit] = useState(30)

  const handleDatasetChange = (key: string) => {
    setDsKey(key)
    const next = datasets.find(d => d.key === key)!
    const d = pickDefaults(next)
    setChartType(d.chartType)
    setLabelCol(d.labelCol)
    setValueCol(d.valueCol)
    setGroupCol(d.groupCol)
    setShowTable(false)
    setLimit(30)
  }

  const allCols = ds.columns
  const numCols = numericCols(ds)
  const catOptions = catCols(ds)
  const pids = pidCols(ds)

  const labelOptions = allCols.filter(c => c.type !== 'participant').map(c => ({ value: c.name, label: c.name }))
  const valueOptions = [
    { value: '', label: '(count)' },
    ...numCols.map(c => ({ value: c.name, label: c.name })),
  ]
  const groupOptions = [
    { value: '', label: '(none)' },
    ...catOptions.filter(c => c.name !== labelCol).map(c => ({ value: c.name, label: c.name })),
  ]

  const needsGroup = chartType === 'stacked' || chartType === 'clustered'
  const needsSecondNumeric = chartType === 'scatter'
  const isHeatmap = chartType === 'heatmap'

  const scatterXOptions = numCols.map(c => ({ value: c.name, label: c.name }))
  const scatterYOptions = numCols.filter(c => c.name !== labelCol).map(c => ({ value: c.name, label: c.name }))

  const chart = useMemo(() => {
    if (width <= 0) return null
    const rows = ds.rows

    if (chartType === 'scatter') {
      const xCol = labelCol
      const yCol = valueCol || numCols[1]?.name
      if (!xCol || !yCol) return <p className="text-[15px] text-text-muted">Need 2 numeric columns for scatter.</p>
      const points: ScatterDatum[] = rows
        .map(r => ({ x: Number(r[xCol]) || 0, y: Number(r[yCol]) || 0, label: String(r[catOptions[0]?.name] ?? r[allCols[0]?.name] ?? '') }))
        .filter(d => d.x !== 0 || d.y !== 0)
        .slice(0, 200)
      return <ScatterPlot data={points} width={width} xLabel={xCol} yLabel={yCol} />
    }

    if (isHeatmap) {
      if (pids.length > 0) {
        const cells = buildParticipantHeatmap(rows, labelCol, pids.map(p => p.name)).slice(0, 3000)
        return <HeatMap data={cells} width={width} valueLabel="count" />
      }
      if (groupCol) {
        const cells: HeatCell[] = []
        for (const row of rows) {
          const r = String(row[labelCol] ?? '')
          const c = String(row[groupCol] ?? '')
          const v = valueCol ? (Number(row[valueCol]) || 0) : 1
          cells.push({ row: r, col: c, value: v })
        }
        return <HeatMap data={cells.slice(0, 3000)} width={width} valueLabel={valueCol || 'count'} />
      }
      return <p className="text-[15px] text-text-muted">Heat map needs a group-by column or participant columns.</p>
    }

    if (needsGroup) {
      const effectiveAgg = valueCol ? agg : 'count'
      const grouped = aggregateGrouped(rows, labelCol, valueCol || null, groupCol || catOptions[1]?.name || '', effectiveAgg).slice(0, limit)
      if (chartType === 'stacked') return <StackedBarChart data={grouped} width={width} valueLabel={valueCol || 'count'} />
      return <ClusteredBarChart data={grouped} width={width} valueLabel={valueCol || 'count'} />
    }

    const effectiveAgg = valueCol ? agg : 'count'
    const barData = aggregate(rows, labelCol, valueCol || null, effectiveAgg).slice(0, limit)

    if (chartType === 'pie') return <PieChart data={barData} width={width} />
    if (chartType === 'treemap') return <TreeMap data={barData} width={width} />
    return <BarChart data={barData} width={width} valueLabel={valueCol || 'count'} />
  }, [ds, chartType, labelCol, valueCol, groupCol, agg, width, limit])

  const tableColumns = allCols.filter(c => c.type !== 'participant').map(c => c.name)
  const tableRows = ds.rows.slice(0, 100)

  return (
    <section aria-labelledby="explorer-heading">
      <div className="mb-6">
        <p className="section-label">07 — Data explorer</p>
        <h1 id="explorer-heading" className="section-heading">
          Visualize any dataset, any chart type.
        </h1>
        <p className="body-lg">
          Choose a dataset and chart type to build custom visualizations from the research data.
        </p>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Select
            label="Dataset"
            value={dsKey}
            onChange={handleDatasetChange}
            options={datasets.map(d => ({ value: d.key, label: d.label }))}
          />
          <Select
            label="Chart type"
            value={chartType}
            onChange={v => setChartType(v as ChartType)}
            options={CHART_TYPES.map(t => ({ value: t.key, label: t.label }))}
          />
          {needsSecondNumeric ? (
            <>
              <Select label="X axis" value={labelCol} onChange={setLabelCol} options={scatterXOptions} />
              <Select label="Y axis" value={valueCol} onChange={setValueCol} options={scatterYOptions} />
            </>
          ) : (
            <>
              <Select label="Label column" value={labelCol} onChange={setLabelCol} options={labelOptions} />
              <Select label="Value column" value={valueCol} onChange={setValueCol} options={valueOptions} />
            </>
          )}
          {(needsGroup || isHeatmap) && (
            <Select label="Group by" value={groupCol} onChange={setGroupCol} options={groupOptions} />
          )}
          {!needsSecondNumeric && !isHeatmap && (
            <Select
              label="Aggregation"
              value={agg}
              onChange={v => setAgg(v as Agg)}
              options={[
                { value: 'sum', label: 'Sum' },
                { value: 'count', label: 'Count' },
                { value: 'avg', label: 'Average' },
              ]}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <p className="font-mono text-xs tracking-[0.06em] text-text-muted px-4 py-2 bg-surface-sunk border border-border rounded-pill inline-block">
          {ds.rows.length} rows · {ds.columns.length} columns ({pids.length} participant cols)
        </p>
        {!isHeatmap && !needsSecondNumeric && (
          <label className="flex items-center gap-2 text-[15px] text-text-muted">
            Show top
            <input
              type="number"
              value={limit}
              onChange={e => setLimit(Math.max(1, Number(e.target.value) || 30))}
              className="w-16 border border-border-strong rounded-button px-3 py-2 text-[15px] bg-surface-raised text-text min-h-12"
              min={1}
              max={500}
            />
          </label>
        )}
      </div>

      <div ref={ref} className="card mb-6">
        {chart}
      </div>

      <button
        onClick={() => setShowTable(!showTable)}
        className="text-[15px] font-bold text-action hover:text-action-hover hover:underline min-h-12 px-4 py-3 rounded-button border border-transparent hover:border-border"
        aria-expanded={showTable}
      >
        {showTable ? 'Hide data table' : 'Show data table'}
      </button>
      {showTable && (
        <div className="mt-3 table-wrap overflow-y-auto" style={{ maxHeight: '60vh' }}>
          <div className="overflow-x-auto">
            <table className="text-[15px] w-full" style={{ borderCollapse: 'collapse' }}>
              <thead className="sticky top-0 bg-surface-sunk z-10">
                <tr className="border-b-2 border-border-strong">
                  {tableColumns.map(c => (
                    <th key={c} scope="col" className="text-left px-4 py-3 font-bold text-navy-900 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-surface-sunk">
                    {tableColumns.map(c => (
                      <td key={c} className="px-4 py-3 text-text max-w-xs truncate">
                        {String(row[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ds.rows.length > 100 && (
            <p className="font-mono text-xs text-text-muted mt-3 px-4 pb-3">
              Showing first 100 of {ds.rows.length} rows
            </p>
          )}
        </div>
      )}
    </section>
  )
}
