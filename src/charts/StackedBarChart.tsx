import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { color, categorical, motion as mt } from '@/tokens/design'

export interface StackedDatum {
  label: string
  segments: { key: string; value: number }[]
}

interface Props {
  data: StackedDatum[]
  width: number
  valueLabel?: string
}

const margin = { top: 10, right: 40, bottom: 50, left: 180 }

export function StackedBarChart({ data, width, valueLabel = '' }: Props) {
  const { shouldAnimate } = useMotion()
  const height = Math.max(data.length * 32 + margin.top + margin.bottom, 200)
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const allKeys = [...new Set(data.flatMap(d => d.segments.map(s => s.key)))]
  const maxVal = Math.max(...data.map(d => d.segments.reduce((s, seg) => s + seg.value, 0)), 1)

  const yScale = scaleBand<string>({ domain: data.map(d => d.label), range: [0, innerH], padding: 0.2 })
  const xScale = scaleLinear<number>({ domain: [0, maxVal], range: [0, innerW], nice: true })
  const colorScale = scaleOrdinal({ domain: allKeys, range: [...categorical] })

  return (
    <div>
      <svg width={width} height={height} role="img" aria-label={valueLabel || 'Stacked bar chart'}>
        <Group top={margin.top} left={margin.left}>
          {data.map((d, i) => {
            const y = yScale(d.label) ?? 0
            let xOffset = 0
            return (
              <g key={i}>
                {d.segments.map((seg, j) => {
                  const barW = xScale(seg.value)
                  const x = xOffset
                  xOffset += barW
                  return (
                    <motion.rect
                      key={j}
                      x={x}
                      y={y}
                      height={yScale.bandwidth()}
                      fill={colorScale(seg.key)}
                      stroke={color.surface}
                      strokeWidth={0.5}
                      initial={shouldAnimate ? { width: 0 } : { width: barW }}
                      animate={{ width: barW }}
                      transition={{ duration: mt.duration / 1000, delay: (i * allKeys.length + j) * (mt.stagger / 2000) }}
                      role="graphics-symbol"
                      aria-label={`${d.label} – ${seg.key}: ${seg.value}`}
                      tabIndex={0}
                    />
                  )
                })}
                <text x={xOffset + 4} y={y + yScale.bandwidth() / 2} dy="0.35em" fontSize={10} fill={color.textMuted}>
                  {d.segments.reduce((s, seg) => s + seg.value, 0)}
                </text>
              </g>
            )
          })}
          <AxisLeft
            scale={yScale}
            tickFormat={v => String(v).length > 28 ? String(v).slice(0, 25) + '…' : String(v)}
            stroke={color.borderStrong}
            tickStroke={color.borderStrong}
            tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
            hideTicks
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            label={valueLabel}
            stroke={color.borderStrong}
            tickStroke={color.borderStrong}
            tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
            labelProps={{ fill: color.textMuted, fontSize: 12 }}
          />
        </Group>
      </svg>
      <div className="flex flex-wrap gap-3 mt-2 px-2">
        {allKeys.map(k => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ background: colorScale(k) }} />
            <span>{k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
