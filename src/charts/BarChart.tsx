import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridColumns } from '@visx/grid'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { color, categorical, motion as mt } from '@/tokens/design'

export interface BarDatum {
  label: string
  value: number
}

export interface ChartClickItem {
  label: string
  value: number
  [key: string]: unknown
}

interface Props {
  data: BarDatum[]
  width: number
  valueLabel?: string
  onItemClick?: (item: ChartClickItem) => void
  highlightedLabels?: string[] | null
  onItemHover?: (label: string | null) => void
}

interface TooltipData {
  label: string
  value: number
  pct: string
}

const margin = { top: 10, right: 40, bottom: 50, left: 180 }

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

export function BarChart({ data, width, valueLabel = '', onItemClick, highlightedLabels, onItemHover }: Props) {
  const { shouldAnimate } = useMotion()
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<TooltipData>()
  const height = Math.max(data.length * 28 + margin.top + margin.bottom, 200)
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const yScale = scaleBand<string>({ domain: data.map(d => d.label), range: [0, innerH], padding: 0.2 })
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const xScale = scaleLinear<number>({ domain: [0, maxVal], range: [0, innerW], nice: true })
  const colorScale = scaleOrdinal({ domain: data.map(d => d.label), range: [...categorical] })
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} role="img" aria-label={valueLabel || 'Bar chart'}>
        <Group top={margin.top} left={margin.left}>
          <GridColumns scale={xScale} height={innerH} stroke={color.border} strokeOpacity={0.5} />
          {data.map((d, i) => {
            const barW = xScale(d.value)
            const y = yScale(d.label) ?? 0
            const pct = total ? ((d.value / total) * 100).toFixed(1) : '0'
            return (
              <g
                key={i}
                style={{
                  cursor: onItemClick ? 'pointer' : undefined,
                  opacity: highlightedLabels?.length ? (highlightedLabels.includes(d.label) ? 1 : 0.15) : 1,
                  transition: 'opacity 150ms ease',
                }}
                onMouseEnter={() => onItemHover?.(d.label)}
                onMouseLeave={() => { onItemHover?.(null); hideTooltip() }}
              >
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
                  onMouseMove={e => {
                    const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect()
                    if (!svgRect) return
                    showTooltip({
                      tooltipData: { label: d.label, value: d.value, pct },
                      tooltipLeft: e.clientX - svgRect.left,
                      tooltipTop: e.clientY - svgRect.top,
                    })
                  }}
                  onClick={() => onItemClick?.({ label: d.label, value: d.value })}
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
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyles}>
          <strong style={{ fontSize: 14 }}>{tooltipData.label}</strong>
          <div style={{ marginTop: 4, opacity: 0.85 }}>{tooltipData.value} ({tooltipData.pct}%)</div>
        </TooltipWithBounds>
      )}
    </div>
  )
}
