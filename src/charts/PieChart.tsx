import { Pie } from '@visx/shape'
import { Group } from '@visx/group'
import { scaleOrdinal } from '@visx/scale'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { color, categorical, motion as mt } from '@/tokens/design'
import type { BarDatum } from './BarChart'

interface Props {
  data: BarDatum[]
  width: number
  donut?: boolean
}

export function PieChart({ data, width, donut = false }: Props) {
  const { shouldAnimate } = useMotion()
  const size = Math.min(width, 500)
  const radius = size / 2 - 40
  const innerRadius = donut ? radius * 0.55 : 0
  const colorScale = scaleOrdinal({ domain: data.map(d => d.label), range: [...categorical] })
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <svg width={size} height={size} role="img" aria-label="Pie chart">
        <Group top={size / 2} left={size / 2}>
          <Pie data={data} pieValue={d => d.value} outerRadius={radius} innerRadius={innerRadius} padAngle={0.01}>
            {pie =>
              pie.arcs.map((arc, i) => {
                const path = pie.path(arc) ?? ''
                const [cx, cy] = pie.path.centroid(arc)
                const pct = ((arc.data.value / total) * 100).toFixed(1)
                return (
                  <g key={i} role="graphics-symbol" aria-label={`${arc.data.label}: ${arc.data.value} (${pct}%)`} tabIndex={0}>
                    <motion.path
                      d={path}
                      fill={colorScale(arc.data.label)}
                      stroke={color.surface}
                      strokeWidth={1.5}
                      initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: mt.duration / 1000, delay: i * mt.stagger / 1000 }}
                    />
                    {arc.endAngle - arc.startAngle > 0.3 && (
                      <text x={cx} y={cy} dy="0.35em" fontSize={10} fill={color.surface} textAnchor="middle" pointerEvents="none">
                        {pct}%
                      </text>
                    )}
                  </g>
                )
              })
            }
          </Pie>
        </Group>
      </svg>
      <div className="flex flex-wrap gap-3 mt-3 px-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ background: colorScale(d.label) }} />
            <span>{d.label} ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
