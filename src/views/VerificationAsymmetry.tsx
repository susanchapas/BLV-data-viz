import { useMemo } from 'react'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Group } from '@visx/group'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { motion } from 'framer-motion'
import { useFilters } from '@/lib/filters'
import { useMotion } from '@/lib/motion'
import { useAnnounce } from '@/lib/announce'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { verificationModes, evidence } from '@/lib/data'
import { ChartWrapper, DataTable } from '@/components/ChartWrapper'
import { DeviceNote } from '@/components/DeviceNote'
import { grey } from '@/tokens/design'
import type { VerificationMode } from '@/lib/types'

const DETECT_FILLS: Record<string, string> = {
  Undetectable: grey[5],
  'Partly detectable': grey[3],
  'Self-evident': grey[1],
}

const margin = { top: 20, right: 20, bottom: 80, left: 250 }

function ModeChart({
  data,
  width,
  height,
}: {
  data: VerificationMode[]
  width: number
  height: number
}) {
  const { shouldAnimate } = useMotion()
  const announce = useAnnounce()
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
    <svg width={width} height={height} role="img" aria-label="Failure modes by evidence weight">
      <Group top={margin.top} left={margin.left}>
        {data.map((d, i) => {
          const rows = Number(d['Rows (n=17)']) || 0
          const barW = xScale(rows)
          const y = yScale(d.Tag) ?? 0
          const fill = DETECT_FILLS[d['Detectable without sight']] ?? grey[3]
          return (
            <motion.rect
              key={d.Tag}
              x={0}
              y={y}
              height={yScale.bandwidth()}
              fill={fill}
              stroke={grey[4]}
              strokeWidth={0.5}
              initial={shouldAnimate ? { width: 0 } : { width: barW }}
              animate={{ width: barW }}
              transition={{ duration: 0.3, delay: i * 0.03, ease: [0, 0, 0.2, 1] }}
              role="graphics-symbol"
              aria-label={`${d['Failure mode']}: ${rows} evidence rows, ${d['Detectable without sight']}`}
              tabIndex={0}
              onFocus={() => announce(`${d['Failure mode']}, ${rows} rows, ${d['Detectable without sight']}`)}
              onClick={() => toggleArrayFilter('detectability', d['Detectable without sight'])}
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

function ResponsiveModeChart({ data }: { data: VerificationMode[] }) {
  const [ref, width] = useContainerWidth()
  const height = Math.max(data.length * 28 + 100, 400)
  return (
    <div ref={ref}>
      {width > 0 && <ModeChart data={data} width={width} height={height} />}
    </div>
  )
}

export function VerificationAsymmetry() {
  const { filters, filterEvidence } = useFilters()

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

  const uniqueParticipants = new Set(filteredEvidence.map((r) => r.Who))

  return (
    <section aria-labelledby="va-heading">
      <h1 id="va-heading" className="text-xl font-semibold text-grey-5 mb-1">
        Verification asymmetry
      </h1>
      <p className="text-sm text-grey-4 mb-1">
        {data.length} of {verificationModes.length} failure modes
      </p>
      <DeviceNote total={uniqueParticipants.size} />

      <div className="mt-4">
        <ChartWrapper
          title="Failure modes by weight of evidence"
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
          <ResponsiveModeChart data={data} />
        </ChartWrapper>
      </div>

      <h2 className="text-lg font-semibold text-grey-5 mt-8 mb-3">All failure modes</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4" scope="col">Tag</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4" scope="col">Failure mode</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4" scope="col">Failure class</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4" scope="col">Detectability</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4" scope="col">Cost to detect</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4 text-right" scope="col">Rows</th>
              <th className="text-left px-2 py-2 border-b border-grey-2 font-medium text-grey-4 text-right" scope="col">Participants</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.Tag} className="hover:bg-grey-0">
                <td className="px-2 py-1.5 border-b border-grey-1 font-mono text-xs">{d.Tag}</td>
                <td className="px-2 py-1.5 border-b border-grey-1">{d['Failure mode']}</td>
                <td className="px-2 py-1.5 border-b border-grey-1">{d['Failure class']}</td>
                <td className="px-2 py-1.5 border-b border-grey-1">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle border border-grey-3"
                    style={{ backgroundColor: DETECT_FILLS[d['Detectable without sight']] ?? grey[3] }}
                  />
                  {d['Detectable without sight']}
                </td>
                <td className="px-2 py-1.5 border-b border-grey-1">{d['Cost to detect']}</td>
                <td className="px-2 py-1.5 border-b border-grey-1 text-right">{d['Rows (n=17)']}</td>
                <td className="px-2 py-1.5 border-b border-grey-1 text-right">{d['Participants (n=17)']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
