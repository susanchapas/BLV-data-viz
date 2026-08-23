import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridColumns } from '@visx/grid'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { color, categorical, motion as mt } from '@/tokens/design'

export interface BarDatum {
  label: string
  value: number
}

interface Props {
  data: BarDatum[]
  width: number
  valueLabel?: string
}

const margin = { top: 10, right: 40, bottom: 50, left: 180 }

export function BarChart({ data, width, valueLabel = '' }: Props) {
  const { shouldAnimate } = useMotion()
  const height = Math.max(data.length * 28 + margin.top + margin.bottom, 200)
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const yScale = scaleBand<string>({ domain: data.map(d => d.label), range: [0, innerH], padding: 0.2 })
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const xScale = scaleLinear<number>({ domain: [0, maxVal], range: [0, innerW], nice: true })
  const colorScale = scaleOrdinal({ domain: data.map(d => d.label), range: [...categorical] })

  return (
    <svg width={width} height={height} role="img" aria-label={valueLabel || 'Bar chart'}>
      <Group top={margin.top} left={margin.left}>
        <GridColumns scale={xScale} height={innerH} stroke={color.border} strokeOpacity={0.5} />
        {data.map((d, i) => {
          const barW = xScale(d.value)
          const y = yScale(d.label) ?? 0
          return (
            <g key={i}>
              <motion.rect
                x={0}
                y={y}
                height={yScale.bandwidth()}
                fill={colorScale(d.label)}
                stroke={color.navy}
                strokeWidth={0.5}
                initial={shouldAnimate ? { width: 0 } : { width: barW }}
                animate={{ width: barW }}
                transition={{ duration: mt.duration / 1000, delay: i * mt.stagger / 1000, ease: [...mt.ease] }}
                role="graphics-symbol"
                aria-label={`${d.label}: ${d.value}`}
                tabIndex={0}
              />
              <text x={barW + 4} y={y + yScale.bandwidth() / 2} dy="0.35em" fontSize={10} fill={color.textMuted}>
                {d.value}
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
  )
}
