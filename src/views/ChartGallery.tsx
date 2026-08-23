import { useMemo, useState } from 'react'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { useAnnounce } from '@/lib/announce'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { charts } from '@/lib/data'
import { ChartWrapper, DataTable } from '@/components/ChartWrapper'
import { color, categorical, motion as motionTokens } from '@/tokens/design'
import { BarChart, PieChart, TreeMap, StackedBarChart, ScatterPlot } from '@/charts'
import type { BarDatum } from '@/charts'
import type { ChartSpec } from '@/lib/types'

type ViewType = 'original' | 'bar' | 'pie' | 'treemap' | 'stacked' | 'scatter'

const VIEW_OPTIONS: { key: ViewType; label: string }[] = [
  { key: 'original', label: 'Original' },
  { key: 'bar', label: 'Bar' },
  { key: 'pie', label: 'Pie' },
  { key: 'treemap', label: 'Treemap' },
  { key: 'stacked', label: 'Stacked' },
  { key: 'scatter', label: 'Scatter' },
]

const margin = { top: 20, right: 20, bottom: 60, left: 200 }

function getValueCol(spec: ChartSpec): string {
  return spec.columns.find((c) =>
    ['Evidence rows', 'Participants (of 17)', 'Distinct reasons', 'Participant mentions', 'Uses it', 'Signal types'].includes(c),
  ) ?? spec.columns[1]
}

function specToBarData(spec: ChartSpec): BarDatum[] {
  const valueIdx = spec.columns.indexOf(getValueCol(spec))
  return spec.rows
    .filter((r) => r[0] != null && !String(r[0]).startsWith('All'))
    .map((r) => ({ label: String(r[0]), value: Number(r[valueIdx]) || 0 }))
}

function GenericBarChart({ spec, width }: { spec: ChartSpec; width: number }) {
  const { shouldAnimate } = useMotion()
  const announce = useAnnounce()
  const valueCol = getValueCol(spec)
  const valueIdx = spec.columns.indexOf(valueCol)
  const dataRows = spec.rows.filter((r) => r[0] != null && !String(r[0]).startsWith('All'))

  const height = Math.max(dataRows.length * 28 + 80, 300)
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const labels = dataRows.map((r) => String(r[0]))
  const yScale = scaleBand<string>({ domain: labels, range: [0, innerH], padding: 0.2 })
  const maxVal = Math.max(...dataRows.map((r) => Number(r[valueIdx]) || 0), 1)
  const xScale = scaleLinear<number>({ domain: [0, maxVal], range: [0, innerW], nice: true })

  return (
    <svg width={width} height={height} role="img" aria-label={spec.title}>
      <Group top={margin.top} left={margin.left}>
        {dataRows.map((row, i) => {
          const label = String(row[0])
          const val = Number(row[valueIdx]) || 0
          const barW = xScale(val)
          const y = yScale(label) ?? 0
          return (
            <g key={i}>
              <motion.rect
                x={0}
                y={y}
                height={Math.max(yScale.bandwidth(), 24)}
                fill={categorical[i % categorical.length]}
                stroke={color.navy}
                strokeWidth={0.5}
                initial={shouldAnimate ? { width: 0 } : { width: barW }}
                animate={{ width: barW }}
                transition={{ duration: motionTokens.duration / 1000, delay: i * motionTokens.stagger / 1000, ease: [...motionTokens.ease] }}
                role="graphics-symbol"
                aria-label={`${label}: ${val}`}
                tabIndex={0}
                onFocus={() => announce(`${label}, ${val} ${valueCol}`)}
              />
              <text x={barW + 4} y={y + yScale.bandwidth() / 2} dy="0.35em" fontSize={10} fill={color.textMuted}>
                {val}
              </text>
            </g>
          )
        })}
        <AxisLeft
          scale={yScale}
          tickFormat={(v) => {
            const s = String(v)
            return s.length > 30 ? s.slice(0, 27) + '…' : s
          }}
          stroke={color.borderStrong}
          tickStroke={color.borderStrong}
          tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
          hideTicks
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          label={valueCol}
          stroke={color.borderStrong}
          tickStroke={color.borderStrong}
          tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
          labelProps={{ fill: color.textMuted, fontSize: 12 }}
        />
      </Group>
    </svg>
  )
}

function ChartRenderer({ spec, width, viewType }: { spec: ChartSpec; width: number; viewType: ViewType }) {
  if (viewType === 'original') return <GenericBarChart spec={spec} width={width} />

  const barData = specToBarData(spec)
  const valueCol = getValueCol(spec)

  switch (viewType) {
    case 'bar':
      return <BarChart data={barData} width={width} valueLabel={valueCol} />
    case 'pie':
      return <PieChart data={barData} width={width} />
    case 'treemap':
      return <TreeMap data={barData} width={width} />
    case 'stacked': {
      const numericIdxs = spec.columns.slice(1).map((c, i) => ({ name: c, idx: i + 1 })).filter(c =>
        spec.rows.some(r => typeof r[c.idx] === 'number'),
      )
      if (numericIdxs.length < 2) {
        return <StackedBarChart data={barData.map(d => ({ label: d.label, segments: [{ key: 'value', value: d.value }] }))} width={width} valueLabel={valueCol} />
      }
      const stacked = spec.rows
        .filter(r => r[0] != null && !String(r[0]).startsWith('All'))
        .map(r => ({
          label: String(r[0]),
          segments: numericIdxs.map(c => ({ key: c.name, value: Number(r[c.idx]) || 0 })),
        }))
      return <StackedBarChart data={stacked} width={width} valueLabel={valueCol} />
    }
    case 'scatter': {
      const numCols = spec.columns.map((c, i) => ({ name: c, idx: i })).filter(c =>
        spec.rows.some(r => typeof r[c.idx] === 'number'),
      )
      if (numCols.length < 2) return <p className="text-sm text-text-muted py-4">Need at least 2 numeric columns for scatter.</p>
      const points = spec.rows
        .filter(r => r[0] != null)
        .map(r => ({ x: Number(r[numCols[0].idx]) || 0, y: Number(r[numCols[1].idx]) || 0, label: String(r[0]) }))
      return <ScatterPlot data={points} width={width} xLabel={numCols[0].name} yLabel={numCols[1].name} />
    }
  }
}

function ResponsiveChart({ spec, viewType }: { spec: ChartSpec; viewType: ViewType }) {
  const [ref, width] = useContainerWidth()
  return (
    <div ref={ref}>
      {width > 0 && <ChartRenderer spec={spec} width={width} viewType={viewType} />}
    </div>
  )
}

function ChartCard({ spec }: { spec: ChartSpec }) {
  const [viewType, setViewType] = useState<ViewType>('original')
  const altText = spec.alt_text ?? `Chart ${spec.number}: ${spec.title}. ${spec.rows.length} data rows.`

  return (
    <ChartWrapper
      title={`Chart ${spec.number}. ${spec.title}`}
      figureLabel={`Chart ${String(spec.number).padStart(2, '0')}`}
      caption={spec.caption}
      source={spec.source_tab ? `${spec.source_tab} tab` : 'Chart Data tab'}
      altText={altText}
      dataTable={<DataTable columns={spec.columns} rows={spec.rows} />}
    >
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {VIEW_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setViewType(opt.key)}
            className={`px-4 py-2.5 text-sm rounded-button min-h-12 border transition-colors ${
              viewType === opt.key
                ? 'bg-navy text-white font-bold border-navy'
                : 'bg-surface-sunk text-text-muted border-border hover:border-navy hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <ResponsiveChart spec={spec} viewType={viewType} />
      {spec.footnote && (
        <p className="text-sm text-text-muted mt-2 italic max-w-[62ch]">{spec.footnote}</p>
      )}
    </ChartWrapper>
  )
}

export function ChartGallery() {
  const sortedCharts = useMemo(() => [...charts].sort((a, b) => a.number - b.number), [])

  return (
    <section aria-labelledby="charts-heading">
      <div className="mb-6">
        <p className="section-label">06 — Chart gallery</p>
        <h1 id="charts-heading" className="section-heading">
          Every chart ships in four forms.
        </h1>
        <p className="body-lg">
          {sortedCharts.length} pre-specified charts. Each chart includes the visualization,
          a text summary, an accessible data table, and a downloadable CSV.
          Switch between bar, pie, treemap, stacked, and scatter views per chart.
        </p>
      </div>

      <div className="space-y-10">
        {sortedCharts.map((spec) => (
          <ChartCard key={spec.id} spec={spec} />
        ))}
      </div>
    </section>
  )
}
