import { Pie } from '@visx/shape'
import { Group } from '@visx/group'
import { scaleOrdinal } from '@visx/scale'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { color, categorical, motion as mt } from '@/tokens/design'
import type { BarDatum, ChartClickItem } from './BarChart'

interface Props {
  data: BarDatum[]
  width: number
  donut?: boolean
  onItemClick?: (item: ChartClickItem) => void
  highlightedLabels?: string[] | null
  onItemHover?: (label: string | null) => void
}

interface TooltipData {
  label: string
  value: number
  pct: string
}

const tooltipStyles = {
  ...defaultStyles,
  background: color.navy,
  color: color.surface,
  fontSize: 13,
  fontFamily: "'IBM Plex Mono', monospace",
  padding: '8px 12px',
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(16,47,93,0.25)',
  pointerEvents: 'none' as const,
  lineHeight: 1.5,
}

export function PieChart({ data, width, donut = false, onItemClick, highlightedLabels, onItemHover }: Props) {
  const { shouldAnimate } = useMotion()
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<TooltipData>()
  const size = Math.min(width, 500)
  const radius = size / 2 - 40
  const innerRadius = donut ? radius * 0.55 : 0
  const colorScale = scaleOrdinal({ domain: data.map(d => d.label), range: [...categorical] })
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div style={{ position: 'relative' }}>
      <svg width={size} height={size} role="img" aria-label="Pie chart">
        <Group top={size / 2} left={size / 2}>
          <Pie data={data} pieValue={d => d.value} outerRadius={radius} innerRadius={innerRadius} padAngle={0.01}>
            {pie =>
              pie.arcs.map((arc, i) => {
                const path = pie.path(arc) ?? ''
                const [cx, cy] = pie.path.centroid(arc)
                const pct = ((arc.data.value / total) * 100).toFixed(1)
                return (
                  <g
                    key={i}
                    role="graphics-symbol"
                    aria-label={`${arc.data.label}: ${arc.data.value} (${pct}%)`}
                    tabIndex={0}
                    style={{
                      cursor: onItemClick ? 'pointer' : undefined,
                      opacity: highlightedLabels?.length ? (highlightedLabels.includes(arc.data.label) ? 1 : 0.15) : 1,
                      transition: 'opacity 150ms ease',
                    }}
                    onMouseMove={e => {
                      const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect()
                      if (!svgRect) return
                      showTooltip({
                        tooltipData: { label: arc.data.label, value: arc.data.value, pct },
                        tooltipLeft: e.clientX - svgRect.left,
                        tooltipTop: e.clientY - svgRect.top,
                      })
                    }}
                    onMouseEnter={() => onItemHover?.(arc.data.label)}
                    onMouseLeave={() => { onItemHover?.(null); hideTooltip() }}
                    onClick={() => onItemClick?.({ label: arc.data.label, value: arc.data.value })}
                  >
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
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyles}>
          <strong style={{ fontSize: 14 }}>{tooltipData.label}</strong>
          <div style={{ marginTop: 4, opacity: 0.85 }}>{tooltipData.value} ({tooltipData.pct}%)</div>
        </TooltipWithBounds>
      )}
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
