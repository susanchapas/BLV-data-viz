import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'

const ROOT = join(import.meta.dirname, '..')
const DATA = join(ROOT, 'data')
const OUT = join(ROOT, 'figures')
mkdirSync(OUT, { recursive: true })

interface ChartSpec {
  id: string
  number: number
  title: string
  caption: string
  source_tab: string | null
  chart_type: string
  columns: string[]
  rows: (string | number | null)[][]
  footnote: string | null
  alt_text: string | null
}

const FONT = "'Albert Sans', Helvetica, Arial, sans-serif"
const GREY = { 1: '#e5e5e5', 2: '#c4c4c4', 3: '#737373', 4: '#525252', 5: '#1a1a1a' }
const VALUE_COLS = [
  'Evidence rows', 'Participants (of 17)', 'Distinct reasons',
  'Participant mentions', 'Uses it', 'Signal types',
]
const WIDTH = 241 // ACM single-column in points

const altTextMap: Record<string, string | null> = JSON.parse(
  readFileSync(join(DATA, 'alt_text.json'), 'utf-8'),
)

const chartFiles = readdirSync(join(DATA, 'charts'))
  .filter((f) => f.endsWith('.json'))
  .sort()

const charts: ChartSpec[] = chartFiles.map((f) => {
  const spec: ChartSpec = JSON.parse(readFileSync(join(DATA, 'charts', f), 'utf-8'))
  spec.alt_text = altTextMap[spec.id] ?? null
  return spec
})

function BarChart({ spec, width }: { spec: ChartSpec; width: number }) {
  const valueCol = spec.columns.find((c) => VALUE_COLS.includes(c)) ?? spec.columns[1]
  const valueIdx = spec.columns.indexOf(valueCol)
  const dataRows = spec.rows.filter((r) => r[0] != null && !String(r[0]).startsWith('All'))

  const margin = { top: 8, right: 12, bottom: 36, left: Math.min(width * 0.52, 130) }
  const barSlot = 13
  const height = dataRows.length * barSlot + margin.top + margin.bottom
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const labels = dataRows.map((r) => String(r[0]))
  const yScale = scaleBand<string>({ domain: labels, range: [0, innerH], padding: 0.15 })
  const maxVal = Math.max(...dataRows.map((r) => Number(r[valueIdx]) || 0), 1)
  const xScale = scaleLinear<number>({ domain: [0, maxVal], range: [0, innerW], nice: true })

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={`${width}pt`}
      height={`${height}pt`}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT}
    >
      <Group top={margin.top} left={margin.left}>
        {dataRows.map((row, i) => {
          const label = String(row[0])
          const val = Number(row[valueIdx]) || 0
          const barW = xScale(val)
          const y = yScale(label) ?? 0
          return (
            <g key={i}>
              <rect
                x={0}
                y={y}
                width={barW}
                height={yScale.bandwidth()}
                fill={GREY[4]}
                stroke={GREY[5]}
                strokeWidth={0.3}
              />
              <text
                x={barW + 2}
                y={y + yScale.bandwidth() / 2}
                dy="0.35em"
                fontSize={6}
                fill={GREY[4]}
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
            return s.length > 32 ? s.slice(0, 29) + '…' : s
          }}
          stroke={GREY[2]}
          tickStroke={GREY[2]}
          tickLabelProps={{ fill: GREY[5], fontSize: 6, fontFamily: FONT }}
          hideTicks
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          label={valueCol}
          stroke={GREY[2]}
          tickStroke={GREY[2]}
          tickLabelProps={{ fill: GREY[5], fontSize: 6, fontFamily: FONT }}
          labelProps={{ fill: GREY[5], fontSize: 7, fontFamily: FONT }}
          numTicks={Math.min(maxVal, 6)}
        />
      </Group>
    </svg>
  )
}

function escapeLatex(s: string): string {
  return s.replace(/[&%$#_{}~^\\]/g, (c) => `\\${c}`)
}

const manifest: Record<string, {
  svg: string
  pdf: string
  tex: string
  csv: string
  source: string
  alt_text: string
}> = {}

for (const spec of charts) {
  const num = String(spec.number).padStart(2, '0')
  const prefix = `fig-${num}`

  // 1. SVG
  const svgMarkup = renderToStaticMarkup(<BarChart spec={spec} width={WIDTH} />)
  const svgPath = join(OUT, `${prefix}.svg`)
  writeFileSync(svgPath, svgMarkup)

  // 2. CSV
  const csvLines = [spec.columns.join(',')]
  for (const row of spec.rows) {
    csvLines.push(row.map((cell) => {
      if (cell == null) return ''
      const s = String(cell)
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(','))
  }
  const csvPath = join(OUT, `${prefix}.csv`)
  writeFileSync(csvPath, csvLines.join('\n') + '\n')

  // 3. TEX stub
  const altText = spec.alt_text ?? `Chart ${spec.number}: ${spec.title}. ${spec.rows.length} data rows.`
  const caption = `Chart ${spec.number}. ${escapeLatex(spec.title)}`
  const texContent = `\\begin{figure}[t]
  \\centering
  \\includegraphics[width=\\columnwidth]{figures/${prefix}}
  \\caption{${caption}}
  \\Description{${escapeLatex(altText)}}
  \\label{fig:chart-${num}}
\\end{figure}
`
  const texPath = join(OUT, `${prefix}.tex`)
  writeFileSync(texPath, texContent)

  // 4. Manifest entry
  manifest[spec.id] = {
    svg: `${prefix}.svg`,
    pdf: `${prefix}.pdf`,
    tex: `${prefix}.tex`,
    csv: `${prefix}.csv`,
    source: spec.source_tab ? `${spec.source_tab} tab` : 'Chart Data tab',
    alt_text: altText,
  }

  console.log(`✓ ${prefix}: ${spec.title}`)
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`\n${charts.length} figures exported to figures/`)
console.log('SVG → PDF conversion: install Inkscape and run:')
console.log('  for f in figures/fig-*.svg; do inkscape "$f" --export-type=pdf; done')
