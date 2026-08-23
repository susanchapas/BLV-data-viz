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
import { verificationModes, evidence, isP011 } from '@/lib/data'
import { ChartWrapper, DataTable } from '@/components/ChartWrapper'
import { DeviceNote } from '@/components/DeviceNote'
import {
  ParticipantPills,
  CodePills,
  EvidencePreview,
  CountButton,
  ExpandedPanel,
  getActiveParticipants,
} from '@/components/LinkedData'
import { color, motion as motionTokens } from '@/tokens/design'
import type { VerificationMode } from '@/lib/types'

const DETECT_FILLS: Record<string, string> = {
  Undetectable: color.navy,
  'Partly detectable': color.textMuted,
  'Self-evident': color.border,
}

const margin = { top: 20, right: 20, bottom: 80, left: 250 }

function ModeChart({
  data,
  width,
  height,
  highlightedLabels,
  onItemHover,
}: {
  data: VerificationMode[]
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
    domain: data.map((d) => d.Tag),
    range: [0, innerH],
    padding: 0.2,
  })

  const maxRows = Math.max(...data.map((d) => Number(d['Rows (n=17)']) || 0), 1)
  const xScale = scaleLinear<number>({
    domain: [0, maxRows],
    range: [0, innerW],
    nice: true,
  })

  return (
    <svg width={width} height={height} role="img" aria-label="Failure modes by weight of evidence">
      <Group top={margin.top} left={margin.left}>
        {data.map((d, i) => {
          const rows = Number(d['Rows (n=17)']) || 0
          const barW = xScale(rows)
          const y = yScale(d.Tag) ?? 0
          const fill = DETECT_FILLS[d['Detectable without sight']] ?? color.textMuted
          return (
            <motion.rect
              key={d.Tag}
              x={0}
              y={y}
              height={Math.max(yScale.bandwidth(), 24)}
              fill={fill}
              stroke={color.navy}
              strokeWidth={0.5}
              initial={shouldAnimate ? { width: 0 } : { width: barW }}
              animate={{ width: barW }}
              transition={{ duration: motionTokens.duration / 1000, delay: i * motionTokens.stagger / 1000, ease: [...motionTokens.ease] }}
              style={{
                opacity: highlightedLabels?.length ? (highlightedLabels.includes(d.Tag) ? 1 : 0.15) : 1,
                transition: 'opacity 150ms ease',
              }}
              role="graphics-symbol"
              aria-label={`${d['Failure mode']}: ${rows} evidence rows, ${d['Detectable without sight']}`}
              tabIndex={0}
              onFocus={() => announce(`${d['Failure mode']}, ${rows} rows, ${d['Detectable without sight']}`)}
              onMouseEnter={() => onItemHover?.(d.Tag)}
              onMouseLeave={() => onItemHover?.(null)}
              onClick={() => {
                toggleArrayFilter('detectability', d['Detectable without sight'])
                navigate(buildDrillUrl({ search: d['Failure mode'] }))
              }}
              className="cursor-pointer"
            />
          )
        })}
        <AxisLeft
          scale={yScale}
          tickFormat={(tag) => {
            const mode = data.find((d) => d.Tag === tag)
            const label = mode?.['Failure mode'] ?? tag
            return String(label).length > 35 ? String(label).slice(0, 32) + '…' : String(label)
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

function ResponsiveModeChart({
  data,
  highlightedLabels,
  onItemHover,
}: {
  data: VerificationMode[]
  highlightedLabels?: string[] | null
  onItemHover?: (label: string | null) => void
}) {
  const [ref, width] = useContainerWidth()
  const height = Math.max(data.length * 28 + 100, 400)
  return (
    <div ref={ref}>
      {width > 0 && <ModeChart data={data} width={width} height={height} highlightedLabels={highlightedLabels} onItemHover={onItemHover} />}
    </div>
  )
}

export function VerificationAsymmetry() {
  const { filters, filterEvidence } = useFilters()
  const { selection, setSelection, clearSelection } = useSelection()
  const [expandedTag, setExpandedTag] = useState<string | null>(null)

  const filteredEvidence = useMemo(() => filterEvidence(evidence), [filterEvidence])

  const data = useMemo(() => {
    let modes = [...verificationModes]
    if (filters.detectability.length) {
      const set = new Set(filters.detectability)
      modes = modes.filter((m) => set.has(m['Detectable without sight']))
    }
    if (filters.failureClass.length) {
      const set = new Set(filters.failureClass)
      modes = modes.filter((m) => set.has(m['Failure class']))
    }
    return modes
  }, [filters.detectability, filters.failureClass])

  const expandedData = useMemo(() => {
    if (!expandedTag) return null
    const mode = data.find((d) => d.Tag === expandedTag)
    if (!mode) return null
    const codeSet = new Set(mode.mode_codes)
    const rows = evidence.filter((r) => {
      if (!filters.includeP011 && isP011(r.Who)) return false
      return codeSet.has(r.Code)
    })
    const { pids, counts } = getActiveParticipants(
      mode as unknown as Record<string, unknown>,
      filters.includeP011,
    )
    return { mode, rows, pids, counts }
  }, [expandedTag, data, filters.includeP011])

  const uniqueParticipants = new Set(filteredEvidence.map((r) => r.Who))
  const toggleExpand = (tag: string) => setExpandedTag((prev) => (prev === tag ? null : tag))

  return (
    <section aria-labelledby="va-heading">
      <div className="mb-6">
        <p className="section-label">02 — Verification asymmetry</p>
        <h1 id="va-heading" className="section-heading">
          Failures the user cannot detect.
        </h1>
        <p className="body-lg">
          {data.length} of {verificationModes.length} failure modes shown.
          Bars coloured by detectability class — darkest bars are undetectable without sight.
        </p>
        <DeviceNote total={uniqueParticipants.size} />
      </div>

      <ChartWrapper
        title="Failure modes by weight of evidence"
        figureLabel="Figure — detectability breakdown"
        caption="Horizontal bar. Each failure mode coloured by detectability class."
        source="Verification Asymmetry tab, rows 4–31"
        altText={`${data.length} failure modes. Bars show evidence row counts. Darkest bars are undetectable failures.`}
        deviceNote={!filters.includeP011 ? 'P011 (EchoVision) excluded from pooled counts' : undefined}
        dataTable={
          <DataTable
            columns={['Tag', 'Failure mode', 'Detectability', 'Evidence rows', 'Participants']}
            rows={data.map((d) => [
              d.Tag,
              d['Failure mode'],
              d['Detectable without sight'],
              d['Rows (n=17)'],
              d['Participants (n=17)'],
            ])}
          />
        }
      >
        <ResponsiveModeChart
          data={data}
          highlightedLabels={selection.labels.length ? selection.labels : null}
          onItemHover={(label) => label ? setSelection([label], 'verification-chart') : clearSelection()}
        />
      </ChartWrapper>

      <div className="mt-10">
        <h2 className="font-heading text-[22px] font-normal text-navy-900 mb-4">All failure modes</h2>
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b-2 border-border-strong bg-surface-sunk">
                  <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Tag</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Failure mode</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Failure class</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Detectability</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Cost to detect</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900 text-right" scope="col">Rows</th>
                  <th className="text-left px-4 py-3 font-bold text-navy-900 text-right" scope="col">Participants</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => {
                  const isExpanded = expandedTag === d.Tag
                  return (
                    <Fragment key={d.Tag}>
                      <tr
                        className={`border-b border-border hover:bg-surface-sunk cursor-pointer ${
                          selection.labels.includes(d.Tag) ? 'bg-cornflower/10' : ''
                        } ${isExpanded ? 'bg-surface-sunk border-b-0' : ''}`}
                        onClick={() => toggleExpand(d.Tag)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          <Link
                            to={buildDrillUrl({ code: d.mode_codes })}
                            className="text-action hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {d.Tag}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={buildDrillUrl({ search: d['Failure mode'] })}
                            className="text-action hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {d['Failure mode']}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{d['Failure class']}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block w-3.5 h-3.5 rounded-full border border-navy"
                              style={{ backgroundColor: DETECT_FILLS[d['Detectable without sight']] ?? color.textMuted }}
                            />
                            {d['Detectable without sight']}
                          </span>
                        </td>
                        <td className="px-4 py-3">{d['Cost to detect']}</td>
                        <td className="px-4 py-3 text-right">
                          <CountButton
                            count={d['Rows (n=17)']}
                            expanded={isExpanded}
                            onClick={() => toggleExpand(d.Tag)}
                            label={`${d['Rows (n=17)']} evidence rows for ${d['Failure mode']}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CountButton
                            count={d['Participants (n=17)']}
                            expanded={isExpanded}
                            onClick={() => toggleExpand(d.Tag)}
                            label={`${d['Participants (n=17)']} participants for ${d['Failure mode']}`}
                          />
                        </td>
                      </tr>
                      <ExpandedPanel open={isExpanded} colSpan={7}>
                        {expandedData && (
                          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
                            <div>
                              <h3 className="font-mono text-xs tracking-[0.14em] uppercase text-navy-900 mb-3">
                                Evidence codes
                              </h3>
                              <CodePills codes={expandedData.mode.mode_codes} />
                              <h3 className="font-mono text-xs tracking-[0.14em] uppercase text-navy-900 mt-5 mb-3">
                                Sample quotes ({expandedData.rows.length} rows)
                              </h3>
                              <EvidencePreview
                                rows={expandedData.rows}
                                drillParams={{ code: expandedData.mode.mode_codes }}
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
