import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridColumns } from '@visx/grid'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { color, categorical, motion as mt } from '@/tokens/design'
import type { StackedDatum } from './StackedBarChart'
import type { ChartClickItem } from './BarChart'

interface Props {
  data: StackedDatum[]
  width: number
  valueLabel?: string
  onItemClick?: (item: ChartClickItem) => void
  highlightedLabels?: string[] | null
}

interface TooltipData {
  groupLabel: string
  key: string
  value: number
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

export function ClusteredBarChart({ data, width, valueLabel = '', onItemClick, highlightedLabels }: Props) {
  const { shouldAnimate } = useMotion()
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<TooltipData>()
  const allKeys = [...new Set(data.flatMap(d => d.segments.map(s => s.key)))]
  const height = Math.max(data.length * (allKeys.length * 16 + 12) + margin.top + margin.bottom, 200)
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const maxVal = Math.max(...data.flatMap(d => d.segments.map(s => s.value)), 1)

  const yScale = scaleBand<string>({ domain: data.map(d => d.label), range: [0, innerH], padding: 0.25 })
  const subScale = scaleBand<string>({ domain: allKeys, range: [0, yScale.bandwidth()], padding: 0.1 })
  const xScale = scaleLinear<number>({ domain: [0, maxVal], range: [0, innerW], nice: true })
  const colorScale = scaleOrdinal({ domain: allKeys, range: [...categorical] })

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} role="img" aria-label={valueLabel || 'Clustered bar chart'}>
        <Group top={margin.top} left={margin.left}>
          <GridColumns scale={xScale} height={innerH} stroke={color.border} strokeOpacity={0.4} />
          {data.map((d, i) => {
            const groupY = yScale(d.label) ?? 0
            return (
              <g
                key={i}
                style={{
                  opacity: highlightedLabels?.length ? (highlightedLabels.includes(d.label) ? 1 : 0.15) : 1,
                  transition: 'opacity 150ms ease',
                }}
              >
                {d.segments.map((seg, j) => {
                  const barW = xScale(seg.value)
                  const y = groupY + (subScale(seg.key) ?? 0)
                  return (
                    <g key={j}>
                      <motion.rect
                        x={0}
                        y={y}
                        height={subScale.bandwidth()}
                        fill={colorScale(seg.key)}
                        stroke={color.navy}
                        strokeWidth={0.3}
                        initial={shouldAnimate ? { width: 0 } : { width: barW }}
                        animate={{ width: barW }}
                        transition={{ duration: mt.duration / 1000, delay: (i * allKeys.length + j) * (mt.stagger / 2000) }}
                        role="graphics-symbol"
                        aria-label={`${d.label} – ${seg.key}: ${seg.value}`}
                        tabIndex={0}
                        style={{ cursor: onItemClick ? 'pointer' : undefined }}
                        onMouseMove={e => {
                          const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect()
                          if (!svgRect) return
                          showTooltip({
                            tooltipData: { groupLabel: d.label, key: seg.key, value: seg.value },
                            tooltipLeft: e.clientX - svgRect.left,
                            tooltipTop: e.clientY - svgRect.top,
                          })
                        }}
                        onMouseLeave={() => hideTooltip()}
                        onClick={() => onItemClick?.({ label: d.label, value: seg.value, segment: seg.key })}
                      />
                      <text x={barW + 3} y={y + subScale.bandwidth() / 2} dy="0.35em" fontSize={9} fill={color.textMuted}>
                        {seg.value}
                      </text>
                    </g>
                  )
                })}
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
          <div style={{ opacity: 0.7, fontSize: 11 }}>{tooltipData.groupLabel}</div>
          <strong>{tooltipData.key}</strong>
          <div style={{ marginTop: 4, opacity: 0.85 }}>{tooltipData.value}</div>
        </TooltipWithBounds>
      )}
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
