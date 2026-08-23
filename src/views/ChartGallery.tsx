import { useMemo } from 'react'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { useAnnounce } from '@/lib/announce'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { charts } from '@/lib/data'
import { ChartWrapper, DataTable } from '@/components/ChartWrapper'
import { grey, motion as motionTokens } from '@/tokens/design'
import type { ChartSpec } from '@/lib/types'

const margin = { top: 20, right: 20, bottom: 60, left: 200 }

function GenericBarChart({ spec, width }: { spec: ChartSpec; width: number }) {
  const { shouldAnimate } = useMotion()
  const announce = useAnnounce()
  const valueCol = spec.columns.find((c) =>
    ['Evidence rows', 'Participants (of 17)', 'Distinct reasons', 'Participant mentions', 'Uses it', 'Signal types'].includes(c),
  ) ?? spec.columns[1]
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
                fill={grey[4]}
                stroke={grey[5]}
                strokeWidth={0.5}
                initial={shouldAnimate ? { width: 0 } : { width: barW }}
                animate={{ width: barW }}
                transition={{ duration: motionTokens.duration / 1000, delay: i * motionTokens.stagger / 1000, ease: [...motionTokens.ease] }}
                role="graphics-symbol"
                aria-label={`${label}: ${val}`}
                tabIndex={0}
                onFocus={() => announce(`${label}, ${val} ${valueCol}`)}
              />
              <text
                x={barW + 4}
                y={y + yScale.bandwidth() / 2}
                dy="0.35em"
                fontSize={10}
                fill={grey[4]}
              >
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
          stroke={grey[2]}
          tickStroke={grey[2]}
          tickLabelProps={{ fill: grey[4], fontSize: 11 }}
          hideTicks
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          label={valueCol}
          stroke={grey[2]}
          tickStroke={grey[2]}
          tickLabelProps={{ fill: grey[4], fontSize: 11 }}
          labelProps={{ fill: grey[4], fontSize: 12 }}
        />
      </Group>
    </svg>
  )
}

function ResponsiveBarChart({ spec }: { spec: ChartSpec }) {
  const [ref, width] = useContainerWidth()
  return (
    <div ref={ref}>
      {width > 0 && <GenericBarChart spec={spec} width={width} />}
    </div>
  )
}

function ChartCard({ spec }: { spec: ChartSpec }) {
  const altText = spec.alt_text ?? `Chart ${spec.number}: ${spec.title}. ${spec.rows.length} data rows.`

  return (
    <ChartWrapper
      title={`Chart ${spec.number}. ${spec.title}`}
      caption={spec.caption}
      source={spec.source_tab ? `${spec.source_tab} tab` : 'Chart Data tab'}
      altText={altText}
      dataTable={<DataTable columns={spec.columns} rows={spec.rows} />}
    >
      <ResponsiveBarChart spec={spec} />
      {spec.footnote && (
        <p className="text-xs text-grey-3 mt-1 italic">{spec.footnote}</p>
      )}
    </ChartWrapper>
  )
}

export function ChartGallery() {
  const sortedCharts = useMemo(() => [...charts].sort((a, b) => a.number - b.number), [])

  return (
    <section aria-labelledby="charts-heading">
      <h1 id="charts-heading" className="text-xl font-semibold text-grey-5 mb-1">
        Chart gallery
      </h1>
      <p className="text-sm text-grey-4 mb-4">{sortedCharts.length} pre-specified charts</p>

      <div className="space-y-12">
        {sortedCharts.map((spec) => (
          <ChartCard key={spec.id} spec={spec} />
        ))}
      </div>
    </section>
  )
}
