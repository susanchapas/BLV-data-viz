import { useMemo } from 'react'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { motion } from 'framer-motion'
import { useFilters } from '@/lib/filters'
import { useMotion } from '@/lib/motion'
import { useAnnounce } from '@/lib/announce'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { feedbackSignals, evidence } from '@/lib/data'
import { ChartWrapper, DataTable } from '@/components/ChartWrapper'
import { DeviceNote } from '@/components/DeviceNote'
import { grey, motion as motionTokens } from '@/tokens/design'
import type { FeedbackSignal } from '@/lib/types'

const STATUS_FILLS: Record<string, string> = {
  Announced: grey[1],
  Silent: grey[4],
  Consequence: grey[3],
}

const margin = { top: 20, right: 20, bottom: 60, left: 280 }

function SignalChart({
  data,
  width,
  height,
}: {
  data: FeedbackSignal[]
  width: number
  height: number
}) {
  const { shouldAnimate } = useMotion()
  const announce = useAnnounce()
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
    <svg width={width} height={height} aria-hidden="true">
      <Group top={margin.top} left={margin.left}>
        {data.map((d, i) => {
          const rows = Number(d['Rows (n=17)']) || 0
          const barW = xScale(rows)
          const y = yScale(d.Tag) ?? 0
          const fill = STATUS_FILLS[d['Signal status']] ?? grey[3]
          return (
            <motion.rect
              key={d.Tag}
              x={0}
              y={y}
              height={Math.max(yScale.bandwidth(), 24)}
              fill={fill}
              stroke={grey[4]}
              strokeWidth={0.5}
              initial={shouldAnimate ? { width: 0 } : { width: barW }}
              animate={{ width: barW }}
              transition={{ duration: motionTokens.duration / 1000, delay: i * motionTokens.stagger / 1000, ease: [...motionTokens.ease] }}
              role="graphics-symbol"
              aria-label={`${d['Signal the user needs']}: ${rows} rows, ${d['Signal status']}`}
              tabIndex={0}
              onFocus={() =>
                announce(`${d['Signal the user needs']}, ${rows} rows, ${d['Signal status']}`)
              }
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
          stroke={grey[2]}
          tickStroke={grey[2]}
          tickLabelProps={{ fill: grey[4], fontSize: 11 }}
          hideTicks
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          label="Evidence rows"
          stroke={grey[2]}
          tickStroke={grey[2]}
          tickLabelProps={{ fill: grey[4], fontSize: 11 }}
          labelProps={{ fill: grey[4], fontSize: 12 }}
        />
      </Group>
    </svg>
  )
}

function ResponsiveSignalChart({ data }: { data: FeedbackSignal[] }) {
  const [ref, width] = useContainerWidth()
  const height = Math.max(data.length * 28 + 80, 400)
  return (
    <div ref={ref}>
      {width > 0 && <SignalChart data={data} width={width} height={height} />}
    </div>
  )
}

export function SignalLedger() {
  const { filters, filterEvidence } = useFilters()

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
      <h1 id="signals-heading" className="text-xl font-semibold text-grey-5 mb-1">
        Signal ledger
      </h1>
      <p className="text-sm text-grey-4 mb-1">
        {data.length} of {feedbackSignals.length} signals
      </p>
      <DeviceNote total={uniqueParticipants.size} />

      <div className="grid grid-cols-3 gap-4 my-6">
        {Object.entries(byStatus).map(([status, { count, rows }]) => (
          <div key={status} className="p-4 border border-grey-1 rounded">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full border border-grey-3"
                style={{ backgroundColor: STATUS_FILLS[status] ?? grey[3] }}
              />
              <span className="font-medium text-grey-5">{status}</span>
            </div>
            <p className="text-2xl font-semibold text-grey-5">{count}</p>
            <p className="text-sm text-grey-3">{rows} evidence rows</p>
          </div>
        ))}
      </div>

      <ChartWrapper
        title="Every signal the user needs, by weight of evidence"
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
          <ResponsiveSignalChart data={data} />
      </ChartWrapper>
    </section>
  )
}
