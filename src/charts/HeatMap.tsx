import { useMemo, useState } from 'react'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { color, sequential } from '@/tokens/design'

export interface HeatCell {
  row: string
  col: string
  value: number
}

interface Props {
  data: HeatCell[]
  width: number
  valueLabel?: string
}

const margin = { top: 10, right: 30, bottom: 80, left: 180 }

function interpolateSequential(t: number): string {
  const idx = Math.min(Math.floor(t * (sequential.length - 1)), sequential.length - 2)
  return sequential[sequential.length - 1 - idx]
}

export function HeatMap({ data, width, valueLabel = '' }: Props) {
  const [hovered, setHovered] = useState<HeatCell | null>(null)

  const { rows, cols, maxVal } = useMemo(() => {
    const r = [...new Set(data.map(d => d.row))]
    const c = [...new Set(data.map(d => d.col))]
    const m = Math.max(...data.map(d => d.value), 1)
    return { rows: r, cols: c, maxVal: m }
  }, [data])

  const height = Math.max(rows.length * 24 + margin.top + margin.bottom, 200)
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const yScale = scaleBand<string>({ domain: rows, range: [0, innerH], padding: 0.05 })
  const xScale = scaleBand<string>({ domain: cols, range: [0, innerW], padding: 0.05 })
  const colorFn = scaleLinear<number>({ domain: [0, maxVal], range: [0, 1] })

  const cellMap = useMemo(() => {
    const m = new Map<string, number>()
    data.forEach(d => m.set(`${d.row}|${d.col}`, d.value))
    return m
  }, [data])

  return (
    <div>
      <svg width={width} height={height} role="img" aria-label={valueLabel || 'Heat map'}>
        <Group top={margin.top} left={margin.left}>
          {rows.map(r =>
            cols.map(c => {
              const val = cellMap.get(`${r}|${c}`) ?? 0
              const x = xScale(c) ?? 0
              const y = yScale(r) ?? 0
              const t = colorFn(val) as unknown as number
              return (
                <rect
                  key={`${r}|${c}`}
                  x={x}
                  y={y}
                  width={xScale.bandwidth()}
                  height={yScale.bandwidth()}
                  fill={val === 0 ? color.surfaceSunk : interpolateSequential(t)}
                  stroke={color.surface}
                  strokeWidth={1}
                  role="graphics-symbol"
                  aria-label={`${r}, ${c}: ${val}`}
                  tabIndex={0}
                  onMouseEnter={() => setHovered({ row: r, col: c, value: val })}
                  onMouseLeave={() => setHovered(null)}
                />
              )
            }),
          )}
          <AxisLeft
            scale={yScale}
            tickFormat={v => String(v).length > 25 ? String(v).slice(0, 22) + '…' : String(v)}
            stroke={color.borderStrong}
            tickStroke="transparent"
            tickLabelProps={{ fill: color.textMuted, fontSize: 10 }}
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            stroke={color.borderStrong}
            tickStroke="transparent"
            tickLabelProps={{ fill: color.textMuted, fontSize: 10, angle: -45, textAnchor: 'end', dy: -4 }}
          />
        </Group>
      </svg>
      {hovered && (
        <div className="text-xs text-text-muted mt-1 px-2">
          {hovered.row} × {hovered.col}: <strong className="text-text">{hovered.value}</strong> {valueLabel}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 px-2 text-xs text-text-muted">
        <span>0</span>
        <div className="flex h-3 flex-1 max-w-48 rounded-sm overflow-hidden">
          {sequential.slice().reverse().map((c, i) => (
            <div key={i} className="flex-1" style={{ background: c }} />
          ))}
        </div>
        <span>{maxVal}</span>
      </div>
    </div>
  )
}
