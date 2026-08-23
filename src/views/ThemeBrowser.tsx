import { useMemo, useState } from 'react'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { motion } from 'framer-motion'
import { useFilters } from '@/lib/filters'
import { useMotion } from '@/lib/motion'
import { useAnnounce } from '@/lib/announce'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { themes, codebook, evidence } from '@/lib/data'
import { ChartWrapper, DataTable } from '@/components/ChartWrapper'
import { DeviceNote } from '@/components/DeviceNote'
import { grey, motion as motionTokens } from '@/tokens/design'

const margin = { top: 20, right: 20, bottom: 60, left: 200 }

function ThemeChart({ width, height }: { width: number; height: number }) {
  const { shouldAnimate } = useMotion()
  const announce = useAnnounce()
  const { toggleArrayFilter } = useFilters()
  const innerW = Math.max(width - margin.left - margin.right, 0)
  const innerH = Math.max(height - margin.top - margin.bottom, 0)

  const yScale = scaleBand<string>({
    domain: themes.map((t) => t.Theme),
    range: [0, innerH],
    padding: 0.2,
  })

  const maxTotal = Math.max(...themes.map((t) => t.Total), 1)
  const xScale = scaleLinear<number>({
    domain: [0, maxTotal],
    range: [0, innerW],
    nice: true,
  })

  return (
    <svg width={width} height={height} aria-hidden="true">
      <Group top={margin.top} left={margin.left}>
        {themes.map((t, i) => {
          const barW = xScale(t.Total)
          const y = yScale(t.Theme) ?? 0
          return (
            <motion.rect
              key={t.Theme}
              x={0}
              y={y}
              height={Math.max(yScale.bandwidth(), 24)}
              fill={grey[4]}
              stroke={grey[5]}
              strokeWidth={0.5}
              initial={shouldAnimate ? { width: 0 } : { width: barW }}
              animate={{ width: barW }}
              transition={{ duration: motionTokens.duration / 1000, delay: i * motionTokens.stagger / 1000, ease: [...motionTokens.ease] }}
              role="graphics-symbol"
              aria-label={`${t.Name}: ${t.Total} evidence rows`}
              tabIndex={0}
              onFocus={() => announce(`${t.Name}, ${t.Total} evidence rows`)}
              onClick={() => toggleArrayFilter('themes', t.Theme)}
              className="cursor-pointer"
            />
          )
        })}
        <AxisLeft
          scale={yScale}
          tickFormat={(id) => {
            const t = themes.find((th) => th.Theme === id)
            const label = t ? `${t.Theme} ${t.Name}` : String(id)
            return label.length > 28 ? label.slice(0, 25) + '…' : label
          }}
          stroke={grey[2]}
          tickStroke={grey[2]}
          tickLabelProps={{ fill: grey[4], fontSize: 11 }}
          hideTicks
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          label="Evidence rows"
          stroke={grey[2]}
          tickStroke={grey[2]}
          tickLabelProps={{ fill: grey[4], fontSize: 11 }}
          labelProps={{ fill: grey[4], fontSize: 12 }}
        />
      </Group>
    </svg>
  )
}

function ResponsiveThemeChart() {
  const [ref, width] = useContainerWidth()
  const height = themes.length * 28 + 80
  return (
    <div ref={ref}>
      {width > 0 && <ThemeChart width={width} height={height} />}
    </div>
  )
}

export function ThemeBrowser() {
  const { filters, filterEvidence } = useFilters()
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null)

  const filteredEvidence = useMemo(() => filterEvidence(evidence), [filterEvidence])
  const uniqueParticipants = new Set(filteredEvidence.map((r) => r.Who))

  const filteredCodes = useMemo(() => {
    let codes = [...codebook]
    if (filters.themes.length) {
      const set = new Set(filters.themes)
      codes = codes.filter((c) => set.has(c.Theme))
    }
    if (filters.codes.length) {
      const set = new Set(filters.codes)
      codes = codes.filter((c) => set.has(c.Code))
    }
    return codes
  }, [filters.themes, filters.codes])

  return (
    <section aria-labelledby="themes-heading">
      <h1 id="themes-heading" className="text-xl font-semibold text-grey-5 mb-1">
        Themes and codes
      </h1>
      <p className="text-sm text-grey-4 mb-1">
        {themes.length} themes, {filteredCodes.length} of {codebook.length} codes shown
      </p>
      <DeviceNote total={uniqueParticipants.size} />

      <div className="mt-4">
        <ChartWrapper
          title="Theme weight and breadth"
          caption="Horizontal bar. Evidence rows per theme."
          source="Findings tab"
          altText={`22 themes. T2 Reading & Text has the most evidence rows at ${themes.find((t) => t.Theme === 'T2')?.Total ?? '?'}.`}
          dataTable={
            <DataTable
              columns={['Theme', 'Name', 'Evidence rows', 'Sub-themes']}
              rows={themes.map((t) => [t.Theme, t.Name, t.Total, t['Sub-themes']])}
            />
          }
        >
          <ResponsiveThemeChart />
        </ChartWrapper>
      </div>

      <h2 className="text-lg font-semibold text-grey-5 mt-8 mb-3">Codebook ({filteredCodes.length} codes)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4" scope="col">Code</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4" scope="col">Label</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4" scope="col">Theme</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4 text-right" scope="col">Total</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4" scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredCodes.map((c) => (
              <tr
                key={c.Code}
                className="hover:bg-grey-0 cursor-pointer"
                onClick={() => setExpandedTheme(expandedTheme === c.Code ? null : c.Code)}
              >
                <td className="px-2 py-1.5 border-b border-grey-1 font-mono text-xs">{c.Code}</td>
                <td className="px-2 py-1.5 border-b border-grey-1">{c.Label}</td>
                <td className="px-2 py-1.5 border-b border-grey-1">{c.Theme} {c['Theme name']}</td>
                <td className="px-2 py-1.5 border-b border-grey-1 text-right">{c.Total}</td>
                <td className="px-2 py-1.5 border-b border-grey-1 text-xs text-grey-3">{c.Status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
