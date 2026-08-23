import { useMemo } from 'react'
import { scaleOrdinal } from '@visx/scale'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { motion } from 'framer-motion'
import { useMotion } from '@/lib/motion'
import { color, categorical, motion as mt } from '@/tokens/design'
import type { BarDatum, ChartClickItem } from './BarChart'

interface Rect {
  x: number
  y: number
  w: number
  h: number
  label: string
  value: number
}

function layoutTreeMap(items: BarDatum[], width: number, height: number): Rect[] {
  const sorted = [...items].sort((a, b) => b.value - a.value)
  const total = sorted.reduce((s, d) => s + d.value, 0)
  if (total === 0) return []
  return subdivide(sorted, total, 0, 0, width, height)
}

function subdivide(items: BarDatum[], total: number, x: number, y: number, w: number, h: number): Rect[] {
  if (items.length === 0) return []
  if (items.length === 1) return [{ x, y, w, h, label: items[0].label, value: items[0].value }]

  let sum = 0
  let split = 0
  for (let i = 0; i < items.length; i++) {
    sum += items[i].value
    if (sum >= total / 2) { split = i + 1; break }
  }
  split = Math.max(1, Math.min(split, items.length - 1))

  const first = items.slice(0, split)
  const second = items.slice(split)
  const firstTotal = first.reduce((s, d) => s + d.value, 0)
  const frac = firstTotal / total

  if (w >= h) {
    const sw = w * frac
    return [
      ...subdivide(first, firstTotal, x, y, sw, h),
      ...subdivide(second, total - firstTotal, x + sw, y, w - sw, h),
    ]
  }
  const sh = h * frac
  return [
    ...subdivide(first, firstTotal, x, y, w, sh),
    ...subdivide(second, total - firstTotal, x, y + sh, w, h - sh),
  ]
}

interface Props {
  data: BarDatum[]
  width: number
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

export function TreeMap({ data, width, onItemClick, highlightedLabels, onItemHover }: Props) {
  const { shouldAnimate } = useMotion()
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<TooltipData>()
  const height = Math.min(width * 0.6, 450)
  const colorScale = scaleOrdinal({ domain: data.map(d => d.label), range: [...categorical] })

  const rects = useMemo(() => layoutTreeMap(data, width, height), [data, width, height])
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} role="img" aria-label="Tree map">
        {rects.map((r, i) => {
          const pct = total ? ((r.value / total) * 100).toFixed(1) : '0'
          const showLabel = r.w > 50 && r.h > 24
          return (
            <g
              key={i}
              role="graphics-symbol"
              aria-label={`${r.label}: ${r.value} (${pct}%)`}
              tabIndex={0}
              style={{
                cursor: onItemClick ? 'pointer' : undefined,
                opacity: highlightedLabels?.length ? (highlightedLabels.includes(r.label) ? 1 : 0.15) : 1,
                transition: 'opacity 150ms ease',
              }}
              onMouseMove={e => {
                const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect()
                if (!svgRect) return
                showTooltip({
                  tooltipData: { label: r.label, value: r.value, pct },
                  tooltipLeft: e.clientX - svgRect.left,
                  tooltipTop: e.clientY - svgRect.top,
                })
              }}
              onMouseEnter={() => onItemHover?.(r.label)}
              onMouseLeave={() => { onItemHover?.(null); hideTooltip() }}
              onClick={() => onItemClick?.({ label: r.label, value: r.value })}
            >
              <motion.rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={colorScale(r.label)}
                stroke={color.surface}
                strokeWidth={2}
                initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: mt.duration / 1000, delay: i * mt.stagger / 1000 }}
              />
              {showLabel && (
                <>
                  <text x={r.x + 4} y={r.y + 14} fontSize={11} fill={color.surface} fontWeight={600}>
                    {r.label.length > Math.floor(r.w / 7) ? r.label.slice(0, Math.floor(r.w / 7) - 1) + '…' : r.label}
                  </text>
                  {r.h > 36 && (
                    <text x={r.x + 4} y={r.y + 28} fontSize={10} fill={color.surface} opacity={0.85}>
                      {r.value} ({pct}%)
                    </text>
                  )}
                </>
              )}
            </g>
          )
        })}
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyles}>
          <strong style={{ fontSize: 14 }}>{tooltipData.label}</strong>
          <div style={{ marginTop: 4, opacity: 0.85 }}>{tooltipData.value} ({tooltipData.pct}%)</div>
        </TooltipWithBounds>
      )}
      <div className="flex flex-wrap gap-3 mt-3 px-2">
        {data.slice(0, 12).map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ background: colorScale(d.label) }} />
            <span>{d.label} ({d.value})</span>
          </div>
        ))}
        {data.length > 12 && <span className="text-xs text-text-muted">+{data.length - 12} more</span>}
      </div>
    </div>
  )
}
