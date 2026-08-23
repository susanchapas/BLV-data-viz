import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { motion } from 'framer-motion'
import { useFilters } from '@/lib/filters'
import { useMotion } from '@/lib/motion'
import { useAnnounce } from '@/lib/announce'
import { useSelection } from '@/lib/selection'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { buildDrillUrl } from '@/lib/drilldown'
import { feedbackSignals, evidence } from '@/lib/data'
import { ChartWrapper, DataTable } from '@/components/ChartWrapper'
import { DeviceNote } from '@/components/DeviceNote'
import { color, motion as motionTokens } from '@/tokens/design'
import type { FeedbackSignal } from '@/lib/types'

const STATUS_FILLS: Record<string, string> = {
  Announced: color.border,
  Silent: color.navy,
  Consequence: color.textMuted,
}

const STATUS_ACCENT: Record<string, string> = {
  Announced: '#4E521C',
  Silent: '#102F5D',
  Consequence: '#75276F',
}

const margin = { top: 20, right: 20, bottom: 60, left: 280 }

function SignalChart({
  data,
  width,
  height,
  highlightedLabels,
  onItemHover,
}: {
  data: FeedbackSignal[]
  width: number
  height: number
  highlightedLabels?: string[] | null
  onItemHover?: (label: string | null) => void
}) {
  const { shouldAnimate } = useMotion()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const yScale = scaleBand<string>({
    domain: data.map((d) => d.Tag),
    range: [0, innerH],
    padding: 0.2,
  })

  const maxRows = Math.max(...data.map((d) => Number(d['Rows (n=17)']) || 0), 1)
  const xScale = scaleLinear<number>({
    domain: [0, maxRows],
    range: [0, innerW],
    nice: true,
  })

  return (
    <svg width={width} height={height} role="img" aria-label="Signals by weight of evidence">
      <Group top={margin.top} left={margin.left}>
        {data.map((d, i) => {
          const rows = Number(d['Rows (n=17)']) || 0
          const barW = xScale(rows)
          const y = yScale(d.Tag) ?? 0
          const fill = STATUS_FILLS[d['Signal status']] ?? color.textMuted
          return (
            <motion.rect
              key={d.Tag}
              x={0}
              y={y}
              height={Math.max(yScale.bandwidth(), 24)}
              fill={fill}
              stroke={color.navy}
              strokeWidth={0.5}
              initial={shouldAnimate ? { width: 0 } : { width: barW }}
              animate={{ width: barW }}
              transition={{ duration: motionTokens.duration / 1000, delay: i * motionTokens.stagger / 1000, ease: [...motionTokens.ease] }}
              style={{
                opacity: highlightedLabels?.length ? (highlightedLabels.includes(d.Tag) ? 1 : 0.15) : 1,
                transition: 'opacity 150ms ease',
              }}
              role="graphics-symbol"
              aria-label={`${d['Signal the user needs']}: ${rows} rows, ${d['Signal status']}`}
              tabIndex={0}
              onFocus={() =>
                announce(`${d['Signal the user needs']}, ${rows} rows, ${d['Signal status']}`)
              }
              onMouseEnter={() => onItemHover?.(d.Tag)}
              onMouseLeave={() => onItemHover?.(null)}
              onClick={() => navigate(buildDrillUrl({ search: d['Signal the user needs'] }))}
              className="cursor-pointer"
            />
          )
        })}
        <AxisLeft
          scale={yScale}
          tickFormat={(tag) => {
            const sig = data.find((d) => d.Tag === tag)
            const label = sig ? `${tag} ${sig['Signal the user needs']}` : String(tag)
            return label.length > 40 ? label.slice(0, 37) + '…' : label
          }}
          stroke={color.borderStrong}
          tickStroke={color.borderStrong}
          tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
          hideTicks
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          label="Evidence rows"
          stroke={color.borderStrong}
          tickStroke={color.borderStrong}
          tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
          labelProps={{ fill: color.textMuted, fontSize: 12 }}
        />
      </Group>
    </svg>
  )
}

function ResponsiveSignalChart({
  data,
  highlightedLabels,
  onItemHover,
}: {
  data: FeedbackSignal[]
  highlightedLabels?: string[] | null
  onItemHover?: (label: string | null) => void
}) {
  const [ref, width] = useContainerWidth()
  const height = Math.max(data.length * 28 + 80, 400)
  return (
    <div ref={ref}>
      {width > 0 && <SignalChart data={data} width={width} height={height} highlightedLabels={highlightedLabels} onItemHover={onItemHover} />}
    </div>
  )
}

export function SignalLedger() {
  const { filters, filterEvidence } = useFilters()
  const { selection, setSelection, clearSelection } = useSelection()

  const filteredEvidence = useMemo(() => filterEvidence(evidence), [filterEvidence])
  const uniqueParticipants = new Set(filteredEvidence.map((r) => r.Who))

  const data = useMemo(() => {
    let signals = [...feedbackSignals]
    if (filters.signalStatus.length) {
      const set = new Set(filters.signalStatus)
      signals = signals.filter((s) => set.has(s['Signal status']))
    }
    return signals
  }, [filters.signalStatus])

  const byStatus = useMemo(() => {
    const groups: Record<string, { count: number; rows: number }> = {}
    for (const s of feedbackSignals) {
      const status = s['Signal status']
      if (!groups[status]) groups[status] = { count: 0, rows: 0 }
      groups[status].count++
      groups[status].rows += Number(s['Rows (n=17)']) || 0
    }
    return groups
  }, [])

  return (
    <section aria-labelledby="signals-heading">
      <div className="mb-6">
        <p className="section-label">03 — Signal ledger</p>
        <h1 id="signals-heading" className="section-heading">
          What the device tells, and what it withholds.
        </h1>
        <p className="body-lg">
          {data.length} of {feedbackSignals.length} feedback signals.
          Signals classified by status: announced (the device says something), silent (it says nothing), or consequence (the user discovers later).
        </p>
        <DeviceNote total={uniqueParticipants.size} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {Object.entries(byStatus).map(([status, { count, rows }]) => (
          <div
            key={status}
            className="card"
            style={{ borderTopWidth: '4px', borderTopColor: STATUS_ACCENT[status] ?? color.textMuted }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className="w-4 h-4 rounded-full border border-navy"
                style={{ backgroundColor: STATUS_FILLS[status] ?? color.textMuted }}
              />
              <span className="font-mono text-xs tracking-[0.14em] uppercase text-navy-900">{status}</span>
            </div>
            <p className="font-heading text-[32px] text-navy-900 leading-none mb-1">{count}</p>
            <p className="text-[15px] text-text-muted">{rows} evidence rows</p>
          </div>
        ))}
      </div>

      <ChartWrapper
        title="Every signal the user needs, by weight of evidence"
        figureLabel="Figure — signal status breakdown"
        caption="Horizontal bar. Signals coloured by status: announced, silent, consequence."
        source="Feedback & Signal tab"
        altText={`${data.length} signals. ${byStatus['Silent']?.count ?? 0} silent signals carry ${byStatus['Silent']?.rows ?? 0} evidence rows.`}
        deviceNote={!filters.includeP011 ? 'P011 (EchoVision) excluded from pooled counts' : undefined}
        dataTable={
          <DataTable
            columns={['Tag', 'Signal', 'Status', 'Evidence rows', 'Participants']}
            rows={data.map((d) => [
              d.Tag,
              d['Signal the user needs'],
              d['Signal status'],
              d['Rows (n=17)'],
              d['Participants (n=17)'],
            ])}
          />
        }
      >
          <ResponsiveSignalChart
            data={data}
            highlightedLabels={selection.labels.length && selection.source !== 'signal-chart' ? selection.labels : null}
            onItemHover={(label) => label ? setSelection([label], 'signal-chart') : clearSelection()}
          />
      </ChartWrapper>
    </section>
  )
}
