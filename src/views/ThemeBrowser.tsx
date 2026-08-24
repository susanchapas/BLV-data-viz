import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { motion } from 'framer-motion'
import { useFilters } from '@/lib/filters'
import { useMotion } from '@/lib/motion'
import { useAnnounce } from '@/lib/announce'
import { useSelection } from '@/lib/selection'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { buildDrillUrl } from '@/lib/drilldown'
import { themes, codebook, evidence, isP011 } from '@/lib/data'
import { ChartWrapper, DataTable } from '@/components/ChartWrapper'
import { DeviceNote } from '@/components/DeviceNote'
import {
  ParticipantPills,
  EvidencePreview,
  CountButton,
  ExpandedPanel,
  getActiveParticipants,
} from '@/components/LinkedData'
import { color, categorical, motion as motionTokens } from '@/tokens/design'

const margin = { top: 20, right: 20, bottom: 60, left: 200 }

function ThemeChart({
  width,
  height,
  highlightedLabels,
  onItemHover,
}: {
  width: number
  height: number
  highlightedLabels?: string[] | null
  onItemHover?: (label: string | null) => void
}) {
  const { shouldAnimate } = useMotion()
  const announce = useAnnounce()
  const navigate = useNavigate()
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
    <svg width={width} height={height} role="img" aria-label="Theme weight and breadth">
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
              fill={categorical[i % categorical.length]}
              stroke={color.navy}
              strokeWidth={0.5}
              initial={shouldAnimate ? { width: 0 } : { width: barW }}
              animate={{ width: barW }}
              transition={{ duration: motionTokens.duration / 1000, delay: i * motionTokens.stagger / 1000, ease: [...motionTokens.ease] }}
              style={{
                opacity: highlightedLabels?.length ? (highlightedLabels.includes(t.Theme) ? 1 : 0.15) : 1,
                transition: 'opacity 150ms ease',
              }}
              role="graphics-symbol"
              aria-label={`${t.Name}: ${t.Total} evidence rows`}
              tabIndex={0}
              onFocus={() => announce(`${t.Name}, ${t.Total} evidence rows`)}
              onMouseEnter={() => onItemHover?.(t.Theme)}
              onMouseLeave={() => onItemHover?.(null)}
              onClick={() => {
                toggleArrayFilter('themes', t.Theme)
                navigate(buildDrillUrl({ theme: t.Theme }))
              }}
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
          stroke={color.borderStrong}
          tickStroke={color.borderStrong}
          tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
          hideTicks
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          label="Evidence rows"
          stroke={color.borderStrong}
          tickStroke={color.borderStrong}
          tickLabelProps={{ fill: color.textMuted, fontSize: 11 }}
          labelProps={{ fill: color.textMuted, fontSize: 12 }}
        />
      </Group>
    </svg>
  )
}

function ResponsiveThemeChart({
  highlightedLabels,
  onItemHover,
}: {
  highlightedLabels?: string[] | null
  onItemHover?: (label: string | null) => void
}) {
  const [ref, width] = useContainerWidth()
  const height = themes.length * 28 + 80
  return (
    <div ref={ref}>
      {width > 0 && <ThemeChart width={width} height={height} highlightedLabels={highlightedLabels} onItemHover={onItemHover} />}
    </div>
  )
}

export function ThemeBrowser() {
  const { filters, filterEvidence } = useFilters()
  const { selection, setSelection, clearSelection } = useSelection()
  const [expandedCode, setExpandedCode] = useState<string | null>(null)

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
    const matchedCodes = new Set(filteredEvidence.map((r) => r.Code))
    codes = codes.filter((c) => matchedCodes.has(c.Code))
    return codes
  }, [filters.themes, filters.codes, filteredEvidence])

  const expandedData = useMemo(() => {
    if (!expandedCode) return null
    const code = filteredCodes.find((c) => c.Code === expandedCode)
    if (!code) return null
    const rows = evidence.filter((r) => {
      if (!filters.includeP011 && isP011(r.Who)) return false
      return r.Code === expandedCode
    })
    const { pids, counts } = getActiveParticipants(
      code as unknown as Record<string, unknown>,
      filters.includeP011,
    )
    return { code, rows, pids, counts }
  }, [expandedCode, filteredCodes, filters.includeP011])

  const toggleExpand = (code: string) => setExpandedCode((prev) => (prev === code ? null : code))

  return (
    <section aria-labelledby="themes-heading">
      <div className="mb-6">
        <p className="section-label">04 — Themes and codes</p>
        <h1 id="themes-heading" className="section-heading">
          The taxonomy of what participants said.
        </h1>
        <p className="body-lg">
          {themes.length} themes, {filteredCodes.length} of {codebook.length} codes shown.
          Click a bar to filter the codebook below.
        </p>
        <DeviceNote total={uniqueParticipants.size} />
      </div>

      <ChartWrapper
        title="Theme weight and breadth"
        figureLabel="Figure — evidence distribution"
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
        <ResponsiveThemeChart
          highlightedLabels={selection.labels.length && selection.source !== 'theme-chart' ? selection.labels : null}
          onItemHover={(label) => label ? setSelection([label], 'theme-chart') : clearSelection()}
        />
      </ChartWrapper>

      <div className="mt-10">
        <h2 className="font-heading text-[22px] font-normal text-navy-900 mb-4">
          Codebook ({filteredCodes.length} codes)
        </h2>
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b-2 border-border-strong bg-surface-sunk">
                  <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Code</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Label</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Theme</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900 text-right" scope="col">Total</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((c) => {
                  const isExpanded = expandedCode === c.Code
                  return (
                    <Fragment key={c.Code}>
                      <tr
                        className={`border-b border-border hover:bg-surface-sunk cursor-pointer ${
                          selection.labels.includes(c.Theme) ? 'bg-cornflower/10' : ''
                        } ${isExpanded ? 'bg-surface-sunk border-b-0' : ''}`}
                        onClick={() => toggleExpand(c.Code)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(c.Code) } }}
                        tabIndex={0}
                        aria-expanded={isExpanded}
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          <Link
                            to={buildDrillUrl({ code: c.Code })}
                            className="text-action hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.Code}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{c.Label}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/themes?t=${c.Theme}`}
                            className="text-action hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.Theme} {c['Theme name']}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CountButton
                            count={c.Total}
                            expanded={isExpanded}
                            onClick={() => toggleExpand(c.Code)}
                            label={`${c.Total} evidence rows for ${c.Label}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-text-muted">{c.Status}</td>
                      </tr>
                      <ExpandedPanel open={isExpanded} colSpan={5}>
                        {expandedData && (
                          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
                            <div>
                              {expandedData.code.Note && (
                                <p className="text-sm text-text-muted mb-4 italic">
                                  {expandedData.code.Note}
                                </p>
                              )}
                              <h3 className="font-mono text-xs tracking-[0.14em] uppercase text-navy-900 mb-3">
                                Sample quotes ({expandedData.rows.length} rows)
                              </h3>
                              <EvidencePreview
                                rows={expandedData.rows}
                                drillParams={{ code: expandedCode! }}
                              />
                            </div>
                            <div className="lg:border-l lg:border-border lg:pl-6 lg:min-w-[200px]">
                              <h3 className="font-mono text-xs tracking-[0.14em] uppercase text-navy-900 mb-3">
                                Participants ({expandedData.pids.length})
                              </h3>
                              <ParticipantPills
                                pids={expandedData.pids}
                                counts={expandedData.counts}
                              />
                            </div>
                          </div>
                        )}
                      </ExpandedPanel>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
