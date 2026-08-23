import { scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridRows, GridColumns } from '@visx/grid'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { color, categorical, motion as mt } from '@/tokens/design'

export interface ScatterDatum {
  x: number
  y: number
  label: string
}

interface Props {
  data: ScatterDatum[]
  width: number
  xLabel?: string
  yLabel?: string
}

const margin = { top: 20, right: 30, bottom: 60, left: 60 }

export function ScatterPlot({ data, width, xLabel = '', yLabel = '' }: Props) {
  const { shouldAnimate } = useMotion()
  const height = Math.min(width * 0.65, 500)
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const xExtent = [Math.min(...data.map(d => d.x)), Math.max(...data.map(d => d.x))]
  const yExtent = [Math.min(...data.map(d => d.y)), Math.max(...data.map(d => d.y))]
  const xPad = (xExtent[1] - xExtent[0]) * 0.1 || 1
  const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 1

  const xScale = scaleLinear<number>({ domain: [xExtent[0] - xPad, xExtent[1] + xPad], range: [0, innerW], nice: true })
  const yScale = scaleLinear<number>({ domain: [yExtent[0] - yPad, yExtent[1] + yPad], range: [innerH, 0], nice: true })

  return (
    <svg width={width} height={height} role="img" aria-label="Scatter plot">
      <Group top={margin.top} left={margin.left}>
        <GridRows scale={yScale} width={innerW} stroke={color.border} strokeOpacity={0.4} />
        <GridColumns scale={xScale} height={innerH} stroke={color.border} strokeOpacity={0.4} />
        {data.map((d, i) => (
          <motion.circle
            key={i}
            cx={xScale(d.x)}
            cy={yScale(d.y)}
            r={5}
            fill={categorical[i % categorical.length]}
            stroke={color.navy}
            strokeWidth={1}
            initial={shouldAnimate ? { opacity: 0, r: 0 } : { opacity: 0.85, r: 5 }}
            animate={{ opacity: 0.85, r: 5 }}
            transition={{ duration: mt.duration / 1000, delay: i * mt.stagger / 1000 }}
            role="graphics-symbol"
            aria-label={`${d.label}: (${d.x}, ${d.y})`}
            tabIndex={0}
          />
        ))}
        {data.map((d, i) => (
          <text key={`l-${i}`} x={xScale(d.x)} y={yScale(d.y) - 8} fontSize={9} fill={color.textMuted} textAnchor="middle">
            {d.label}
          </text>
        ))}
        <AxisLeft
          scale={yScale}
          label={yLabel}
          stroke={color.borderStrong}
          tickStroke={color.borderStrong}
          tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
          labelProps={{ fill: color.textMuted, fontSize: 12 }}
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          label={xLabel}
          stroke={color.borderStrong}
          tickStroke={color.borderStrong}
          tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
          labelProps={{ fill: color.textMuted, fontSize: 12 }}
        />
      </Group>
    </svg>
  )
}
