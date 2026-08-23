import { useState, useMemo, useCallback } from 'react'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { evidence, participants, painPoints, feedbackSignals, verificationModes } from '@/lib/data'
import { BarChart, PieChart, StackedBarChart, ClusteredBarChart, TreeMap } from '@/charts'
import type { BarDatum, StackedDatum } from '@/charts'

type ChartKind = 'bar' | 'stacked' | 'clustered' | 'pie' | 'donut' | 'treemap'
type MetricKey = 'quotes' | 'participants' | 'painPoints' | 'codes' | 'signals' | 'failureModes'
type VariableKey =
  | 'theme' | 'subTheme' | 'code'
  | 'signalStatus' | 'detectability'
  | 'ageGroup' | 'gender' | 'visionLevel' | 'education' | 'employment' | 'deviceTenure' | 'mobility'
type DataSource = 'evidence' | 'painPoints' | 'signals' | 'verification'
type DemoKey = Extract<VariableKey, 'ageGroup' | 'gender' | 'visionLevel' | 'education' | 'employment' | 'deviceTenure' | 'mobility'>

const DEMO_KEYS: DemoKey[] = ['ageGroup', 'gender', 'visionLevel', 'education', 'employment', 'deviceTenure', 'mobility']

// ── Demographic simplification ──────────────────────

type DemoRecord = Record<DemoKey, string>

function simplifyAge(raw: string): string {
  const m = raw.match(/(\d+)/)
  if (!m) return 'Unknown'
  const age = parseInt(m[1])
  if (age < 35) return '18–34'
  if (age < 55) return '35–54'
  return '55+'
}

function simplifyGender(raw: string): string {
  const l = raw.toLowerCase()
  if (l.includes('female') || l.startsWith('woman')) return 'Female'
  if (l.includes('male') || l.startsWith('man')) return 'Male'
  return 'Unknown'
}

function simplifyVision(raw: string): string {
  const l = raw.toLowerCase()
  if (l.includes('totally blind') || l.includes('100% blind') || l.includes('no vision') || l.includes('fully blind') || l.includes('total loss') || l.includes('congenitally blind')) return 'Totally blind'
  if (l.includes('light perception') || l.includes('light, colour') || l.includes('light and shadow') || l.includes('light,') || l.includes('2%')) return 'Light perception'
  return 'Low vision'
}

function simplifyEducation(raw: string): string {
  const l = raw.toLowerCase()
  if (l.includes('doctoral') || l.includes('doctorate') || l.includes('phd') || l.includes('postdoctoral') || l.includes('master')) return 'Graduate'
  if (l.includes('bachelor')) return "Bachelor's"
  if (l.includes('some college') || l.includes('semester')) return 'Some college'
  return 'High school'
}

function simplifyEmployment(raw: string): string {
  const l = raw.toLowerCase()
  if (l.includes('retired')) return 'Retired'
  if (l.includes('full-time') || l.includes('part-time') || l.includes('contractor') || l.includes('consultant') || l.includes('self-employed')) return 'Employed'
  return 'Not employed'
}

function simplifyTenure(raw: string): string {
  const l = raw.toLowerCase()
  const yrMatch = l.match(/([\d.]+)\s*year/)
  if (yrMatch) return parseFloat(yrMatch[1]) >= 2 ? '2+ years' : '1–2 years'
  const moMatch = l.match(/(\d+)\s*month/)
  if (moMatch) return parseInt(moMatch[1]) <= 6 ? '< 6 months' : '6–12 months'
  if (l.includes('a year') || l.includes('15 month') || l.includes('1.5 year') || l.includes('over a year')) return '1–2 years'
  return 'Unknown'
}

function simplifyMobility(raw: string): string {
  const l = raw.toLowerCase()
  if (l.includes('wheelchair')) return 'Wheelchair'
  if (l.includes('guide dog')) return 'Guide dog'
  if (l.includes('rarely')) return 'Minimal'
  if (l.includes('cane')) return 'Cane'
  return 'Other'
}

function buildDemographics(p: (typeof participants)[0]): DemoRecord {
  return {
    ageGroup: simplifyAge(String(p['Age band'] ?? '')),
    gender: simplifyGender(String(p['Gender'] ?? '')),
    visionLevel: simplifyVision(String(p['Vision'] ?? '')),
    education: simplifyEducation(String(p['Education'] ?? '')),
    employment: simplifyEmployment(String(p['Employment'] ?? '')),
    deviceTenure: simplifyTenure(String(p['Device tenure'] ?? '')),
    mobility: simplifyMobility(String(p['Mobility'] ?? '')),
  }
}

const demoMap = new Map(participants.map(p => [p.id, buildDemographics(p)]))
const emptyDemo: DemoRecord = { ageGroup: 'Unknown', gender: 'Unknown', visionLevel: 'Unknown', education: 'Unknown', employment: 'Unknown', deviceTenure: 'Unknown', mobility: 'Unknown' }
function demoFor(pid: string): DemoRecord { return demoMap.get(pid) ?? emptyDemo }

// ── Pre-joined datasets ─────────────────────────────

type Row = Record<string, string>
const PID_RE = /^P\d{3}$/

const evidenceJoined: Row[] = evidence.map(e => ({
  pid: e.Who,
  theme: e['Theme name'],
  subTheme: e['Sub-theme'],
  code: e.Code,
  ...demoFor(e.Who),
}))

const painPointJoined: Row[] = painPoints.flatMap(pp => {
  const pids = (pp.Who ?? '').split(/,\s*/).filter(s => PID_RE.test(s.trim()))
  if (pids.length === 0) {
    return [{ pid: '', theme: pp.Theme ?? '', subTheme: pp['Sub-theme'] ?? '', ...emptyDemo }]
  }
  return pids.map(pid => ({
    pid: pid.trim(),
    theme: pp.Theme ?? '',
    subTheme: pp['Sub-theme'] ?? '',
    ...demoFor(pid.trim()),
  }))
})

const signalJoined: Row[] = feedbackSignals.flatMap(sig =>
  participants
    .filter(p => (Number(sig[p.id]) || 0) > 0)
    .map(p => ({
      pid: p.id,
      signalStatus: sig['Signal status'],
      ...demoFor(p.id),
    })),
)

const verificationJoined: Row[] = verificationModes.flatMap(vm =>
  participants
    .filter(p => (Number(vm[p.id]) || 0) > 0)
    .map(p => ({
      pid: p.id,
      detectability: vm['Detectable without sight'],
      ...demoFor(p.id),
    })),
)

// ── Variable & metric definitions ───────────────────

interface VariableDef {
  key: VariableKey
  label: string
  group: 'research' | 'demographic'
  description: string
  measurement: string
  orderedValues?: string[]
}

const VARIABLES: VariableDef[] = [
  { key: 'theme', label: 'Theme', group: 'research', description: 'One of 22 emergent themes from thematic analysis.', measurement: 'Inductive coding across 17 semi-structured interviews' },
  { key: 'subTheme', label: 'Sub-theme', group: 'research', description: 'Fine-grained divisions within themes (361 total).', measurement: 'Second-pass coding within established themes' },
  { key: 'code', label: 'Code', group: 'research', description: 'Labels applied to transcript segments (361 unique).', measurement: 'Inductive open coding of interview quotes' },
  { key: 'signalStatus', label: 'Signal status', group: 'research', description: 'Whether the device announces, stays silent about, or leaves the consequence of a feedback signal.', measurement: 'Classified from 24 identified feedback signals', orderedValues: ['Announced', 'Silent', 'Consequence'] },
  { key: 'detectability', label: 'Detectability', group: 'research', description: 'Whether a verification failure can be detected without sight.', measurement: 'Classified from 28 identified failure modes', orderedValues: ['Self-evident', 'Partly detectable', 'Undetectable'] },
  { key: 'ageGroup', label: 'Age group', group: 'demographic', description: 'Participant age, grouped into three bands.', measurement: 'Self-reported during interview', orderedValues: ['18–34', '35–54', '55+'] },
  { key: 'gender', label: 'Gender', group: 'demographic', description: 'Participant gender identity.', measurement: 'Self-reported during interview', orderedValues: ['Female', 'Male'] },
  { key: 'visionLevel', label: 'Vision level', group: 'demographic', description: 'Simplified vision status.', measurement: 'Self-reported, classified by research team', orderedValues: ['Totally blind', 'Low vision', 'Light perception'] },
  { key: 'education', label: 'Education', group: 'demographic', description: 'Highest level of education completed.', measurement: 'Self-reported during interview', orderedValues: ['High school', 'Some college', "Bachelor's", 'Graduate'] },
  { key: 'employment', label: 'Employment', group: 'demographic', description: 'Current employment status.', measurement: 'Self-reported during interview', orderedValues: ['Employed', 'Retired', 'Not employed'] },
  { key: 'deviceTenure', label: 'Device tenure', group: 'demographic', description: 'How long the participant has owned their smart glasses.', measurement: 'Self-reported during interview', orderedValues: ['< 6 months', '6–12 months', '1–2 years', '2+ years'] },
  { key: 'mobility', label: 'Mobility aid', group: 'demographic', description: 'Primary mobility tool used.', measurement: 'Self-reported during interview', orderedValues: ['Cane', 'Guide dog', 'Wheelchair', 'Minimal'] },
]

const VAR_MAP = new Map(VARIABLES.map(v => [v.key, v]))

interface MetricDef {
  key: MetricKey
  label: string
  question: string
  description: string
  source: DataSource
}

const METRICS: MetricDef[] = [
  { key: 'quotes', label: 'Evidence quotes', question: 'How many coded interview quotes?', description: 'Count of coded interview segments (2,146 total).', source: 'evidence' },
  { key: 'participants', label: 'Unique participants', question: 'How many participants mentioned this?', description: 'Count of distinct participants (out of 17).', source: 'evidence' },
  { key: 'codes', label: 'Unique codes', question: 'How many distinct codes appear?', description: 'Count of unique codebook entries.', source: 'evidence' },
  { key: 'painPoints', label: 'Pain points', question: 'How many pain points?', description: 'Count of identified pain points (110 total).', source: 'painPoints' },
  { key: 'signals', label: 'Feedback signals', question: 'How many feedback signals?', description: 'Count of identified feedback signals (24 total).', source: 'signals' },
  { key: 'failureModes', label: 'Failure modes', question: 'How many verification failure modes?', description: 'Count of identified failure modes (28 total).', source: 'verification' },
]

const METRIC_MAP = new Map(METRICS.map(m => [m.key, m]))

function getSourceRows(source: DataSource): Row[] {
  switch (source) {
    case 'evidence': return evidenceJoined
    case 'painPoints': return painPointJoined
    case 'signals': return signalJoined
    case 'verification': return verificationJoined
  }
}

function getAvailableXAxes(source: DataSource): VariableKey[] {
  const demos: VariableKey[] = [...DEMO_KEYS]
  switch (source) {
    case 'evidence': return ['theme', 'subTheme', 'code', ...demos]
    case 'painPoints': return ['theme', 'subTheme', ...demos]
    case 'signals': return ['signalStatus', ...demos]
    case 'verification': return ['detectability', ...demos]
  }
}

// ── Curated questions ───────────────────────────────

interface CuratedQ {
  label: string
  metric: MetricKey
  xAxis: VariableKey
  splitBy: VariableKey | null
  chartKind: ChartKind
}

const CURATED: CuratedQ[] = [
  { label: 'Which themes dominate the evidence?', metric: 'quotes', xAxis: 'theme', splitBy: null, chartKind: 'bar' },
  { label: 'Themes by vision level', metric: 'quotes', xAxis: 'theme', splitBy: 'visionLevel', chartKind: 'stacked' },
  { label: 'Evidence by age group', metric: 'quotes', xAxis: 'ageGroup', splitBy: null, chartKind: 'bar' },
  { label: 'Pain points by theme', metric: 'painPoints', xAxis: 'theme', splitBy: null, chartKind: 'bar' },
  { label: 'Which signals are missing?', metric: 'signals', xAxis: 'signalStatus', splitBy: null, chartKind: 'bar' },
  { label: "What can't users detect?", metric: 'failureModes', xAxis: 'detectability', splitBy: null, chartKind: 'bar' },
  { label: 'Themes by gender', metric: 'quotes', xAxis: 'theme', splitBy: 'gender', chartKind: 'stacked' },
  { label: 'Participant reach by theme', metric: 'participants', xAxis: 'theme', splitBy: null, chartKind: 'bar' },
]

// ── Data computation ────────────────────────────────

function computeMetricValue(rows: Row[], metric: MetricKey): number {
  switch (metric) {
    case 'quotes':
    case 'painPoints':
    case 'signals':
    case 'failureModes':
      return rows.length
    case 'participants':
      return new Set(rows.map(r => r.pid)).size
    case 'codes':
      return new Set(rows.map(r => r.code).filter(Boolean)).size
  }
}

function computeSimple(rows: Row[], xAxis: VariableKey, metric: MetricKey): BarDatum[] {
  const groups = new Map<string, Row[]>()
  for (const row of rows) {
    const key = row[xAxis] || 'Unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  return Array.from(groups.entries()).map(([label, g]) => ({
    label,
    value: computeMetricValue(g, metric),
  }))
}

function computeSplit(rows: Row[], xAxis: VariableKey, splitBy: VariableKey, metric: MetricKey): StackedDatum[] {
  const groups = new Map<string, Map<string, Row[]>>()
  for (const row of rows) {
    const xKey = row[xAxis] || 'Unknown'
    const sKey = row[splitBy] || 'Unknown'
    if (!groups.has(xKey)) groups.set(xKey, new Map())
    const sub = groups.get(xKey)!
    if (!sub.has(sKey)) sub.set(sKey, [])
    sub.get(sKey)!.push(row)
  }
  return Array.from(groups.entries()).map(([label, sub]) => ({
    label,
    segments: Array.from(sub.entries()).map(([key, sRows]) => ({
      key,
      value: computeMetricValue(sRows, metric),
    })),
  }))
}

function sortBar(data: BarDatum[], ordered?: string[]): BarDatum[] {
  if (ordered) {
    const idx = new Map(ordered.map((v, i) => [v, i]))
    return [...data].sort((a, b) => (idx.get(a.label) ?? 999) - (idx.get(b.label) ?? 999))
  }
  return [...data].sort((a, b) => b.value - a.value)
}

function sortStacked(data: StackedDatum[], ordered?: string[]): StackedDatum[] {
  if (ordered) {
    const idx = new Map(ordered.map((v, i) => [v, i]))
    return [...data].sort((a, b) => (idx.get(a.label) ?? 999) - (idx.get(b.label) ?? 999))
  }
  const total = (d: StackedDatum) => d.segments.reduce((s, seg) => s + seg.value, 0)
  return [...data].sort((a, b) => total(b) - total(a))
}

// ── UI Components ───────────────────────────────────

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-xs tracking-[0.06em] uppercase text-text-muted">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-[15px] border border-border-strong rounded-button px-4 py-3 bg-surface-raised text-text min-h-12"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

// ── Main Component ──────────────────────────────────

export function DataExplorer() {
  const [ref, width] = useContainerWidth()

  const [metric, setMetric] = useState<MetricKey>('quotes')
  const [xAxis, setXAxis] = useState<VariableKey>('theme')
  const [splitBy, setSplitBy] = useState<VariableKey | null>(null)
  const [chartKind, setChartKind] = useState<ChartKind>('bar')
  const [demoFilters, setDemoFilters] = useState<Record<string, Set<string>>>({})
  const [includeP011, setIncludeP011] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [limit, setLimit] = useState(25)

  const metricDef = METRIC_MAP.get(metric)!
  const xAxisDef = VAR_MAP.get(xAxis)!
  const splitByDef = splitBy ? VAR_MAP.get(splitBy) ?? null : null

  const availableX = useMemo(() => getAvailableXAxes(metricDef.source), [metricDef.source])

  const splitByOptions = useMemo(() =>
    VARIABLES
      .filter(v => v.key !== xAxis && availableX.includes(v.key))
      .map(v => ({ value: v.key, label: v.label })),
    [xAxis, availableX],
  )

  const demoUniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {}
    for (const key of DEMO_KEYS) {
      const varDef = VAR_MAP.get(key)
      if (varDef?.orderedValues) {
        result[key] = varDef.orderedValues
      } else {
        const vals = new Set<string>()
        for (const [, demo] of demoMap) vals.add(demo[key])
        result[key] = [...vals].sort()
      }
    }
    return result
  }, [])

  const { barData, stackedData, total, uniqueParticipants } = useMemo(() => {
    let rows = getSourceRows(metricDef.source)

    if (!includeP011) rows = rows.filter(r => r.pid !== 'P011')

    for (const [key, allowed] of Object.entries(demoFilters)) {
      if (allowed.size > 0) rows = rows.filter(r => allowed.has(r[key] ?? ''))
    }

    const total = rows.length
    const uniqueParticipants = new Set(rows.map(r => r.pid)).size

    if (splitBy) {
      let data = computeSplit(rows, xAxis, splitBy, metric)
      data = sortStacked(data, xAxisDef.orderedValues)
      if (!xAxisDef.orderedValues) data = data.slice(0, limit)
      return { barData: null, stackedData: data, total, uniqueParticipants }
    }

    let data = computeSimple(rows, xAxis, metric)
    data = sortBar(data, xAxisDef.orderedValues)
    if (!xAxisDef.orderedValues) data = data.slice(0, limit)
    return { barData: data, stackedData: null, total, uniqueParticipants }
  }, [metric, xAxis, splitBy, demoFilters, includeP011, limit, metricDef.source, xAxisDef.orderedValues])

  const segKeys = useMemo(() => {
    if (!stackedData || !splitBy) return []
    const keys = [...new Set(stackedData.flatMap(d => d.segments.map(s => s.key)))]
    const ordered = splitByDef?.orderedValues
    if (ordered) {
      const idx = new Map(ordered.map((v, i) => [v, i]))
      return keys.sort((a, b) => (idx.get(a) ?? 999) - (idx.get(b) ?? 999))
    }
    return keys.sort()
  }, [stackedData, splitBy, splitByDef])

  const applyCurated = useCallback((q: CuratedQ) => {
    setMetric(q.metric)
    setXAxis(q.xAxis)
    setSplitBy(q.splitBy)
    setChartKind(q.chartKind)
    setDemoFilters({})
    setIncludeP011(false)
    setLimit(25)
  }, [])

  const handleSwap = useCallback(() => {
    if (!splitBy) return
    const newX = splitBy
    const newSplit = xAxis
    setXAxis(newX)
    setSplitBy(newSplit)
  }, [xAxis, splitBy])

  const handleMetricChange = useCallback((key: string) => {
    const m = METRIC_MAP.get(key as MetricKey)
    if (!m) return
    setMetric(key as MetricKey)
    const avail = getAvailableXAxes(m.source)
    if (!avail.includes(xAxis)) {
      setXAxis(avail[0])
      setSplitBy(null)
    }
  }, [xAxis])

  const handleXAxisChange = useCallback((key: string) => {
    setXAxis(key as VariableKey)
    if (splitBy === key) setSplitBy(null)
  }, [splitBy])

  const handleSplitByChange = useCallback((v: string) => {
    const newSplit = v ? (v as VariableKey) : null
    setSplitBy(newSplit)
    if (newSplit && !['stacked', 'clustered'].includes(chartKind)) setChartKind('stacked')
    if (!newSplit && ['stacked', 'clustered'].includes(chartKind)) setChartKind('bar')
  }, [chartKind])

  const toggleDemoFilter = useCallback((demoKey: string, value: string) => {
    setDemoFilters(prev => {
      const next = { ...prev }
      const current = next[demoKey] ? new Set(next[demoKey]) : new Set<string>()
      if (current.has(value)) current.delete(value)
      else current.add(value)
      if (current.size === 0) delete next[demoKey]
      else next[demoKey] = current
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setDemoFilters({})
    setIncludeP011(false)
  }, [])

  const hasActiveFilters = Object.keys(demoFilters).length > 0 || includeP011

  const metricOptions = METRICS.map(m => ({ value: m.key, label: m.question }))
  const xAxisOptions = useMemo(() => availableX.map(key => ({ value: key, label: VAR_MAP.get(key)!.label })), [availableX])

  const chartKindOptions: { key: ChartKind; label: string }[] = splitBy
    ? [{ key: 'stacked', label: 'Stacked' }, { key: 'clustered', label: 'Clustered' }]
    : [{ key: 'bar', label: 'Bar' }, { key: 'pie', label: 'Pie' }, { key: 'donut', label: 'Donut' }, { key: 'treemap', label: 'Treemap' }]

  const chart = useMemo(() => {
    if (width <= 0) return null
    if (stackedData) {
      if (chartKind === 'clustered') return <ClusteredBarChart data={stackedData} width={width} valueLabel={metricDef.label} />
      return <StackedBarChart data={stackedData} width={width} valueLabel={metricDef.label} />
    }
    if (barData) {
      if (chartKind === 'pie') return <PieChart data={barData} width={width} />
      if (chartKind === 'donut') return <PieChart data={barData} width={width} donut />
      if (chartKind === 'treemap') return <TreeMap data={barData} width={width} />
      return <BarChart data={barData} width={width} valueLabel={metricDef.label} />
    }
    return <p className="text-[15px] text-text-muted">No data for this combination.</p>
  }, [barData, stackedData, chartKind, width, metricDef])

  const isCuratedActive = (q: CuratedQ) => metric === q.metric && xAxis === q.xAxis && splitBy === q.splitBy
  const needsLimit = !xAxisDef.orderedValues

  return (
    <section aria-labelledby="explorer-heading">
      <div className="mb-6">
        <p className="section-label">07 — Data explorer</p>
        <h1 id="explorer-heading" className="section-heading">
          Explore the research data, your way.
        </h1>
        <p className="body-lg">
          Pick a question, choose how to break it down, and watch the visualization update live.
        </p>
      </div>

      {/* Curated questions */}
      <div className="mb-6">
        <span className="font-mono text-xs tracking-[0.06em] uppercase text-text-muted block mb-2">
          Curated questions
        </span>
        <div className="flex flex-wrap gap-2">
          {CURATED.map(q => (
            <button
              key={q.label}
              onClick={() => applyCurated(q)}
              className={`group flex items-center gap-2 px-4 py-2.5 text-[14px] rounded-button border transition-colors ${
                isCuratedActive(q)
                  ? 'bg-navy text-white border-navy font-bold'
                  : 'text-text-muted border-border hover:border-border-strong hover:bg-surface-sunk'
              }`}
            >
              <span className={`text-[11px] font-bold tracking-wide uppercase shrink-0 ${
                isCuratedActive(q) ? 'text-sand' : 'text-action'
              }`}>
                Show&nbsp;me
              </span>
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Axes */}
      <div className="card mb-4">
        <span className="font-mono text-xs tracking-[0.06em] uppercase text-text-muted block mb-3">Axes</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <Select
            label="Y-axis · the question"
            value={metric}
            onChange={handleMetricChange}
            options={metricOptions}
          />
          <Select
            label="X-axis · cross-tabulate by"
            value={xAxis}
            onChange={handleXAxisChange}
            options={xAxisOptions}
          />
          <Select
            label="Split by"
            value={splitBy ?? ''}
            onChange={handleSplitByChange}
            options={[{ value: '', label: '(none)' }, ...splitByOptions]}
          />
          <button
            onClick={handleSwap}
            disabled={!splitBy}
            className="min-h-12 px-4 py-2.5 rounded-button border border-border-strong text-text-muted hover:bg-surface-sunk hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-mono text-sm"
            title="Swap X-axis and Split by"
            aria-label="Swap axes"
          >
            ⇄ Swap
          </button>
        </div>
      </div>

      {/* Chart type */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Chart type">
          {chartKindOptions.map(t => (
            <button
              key={t.key}
              onClick={() => setChartKind(t.key)}
              role="radio"
              aria-checked={chartKind === t.key}
              className={`px-4 py-2 text-[14px] rounded-button min-h-9 border transition-colors ${
                chartKind === t.key
                  ? 'bg-navy text-white font-bold border-navy'
                  : 'text-text-muted hover:bg-surface-sunk border-border hover:border-border-strong'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 font-mono text-xs tracking-[0.06em] uppercase text-text-muted hover:text-text w-full text-left py-1"
          aria-expanded={showFilters}
        >
          <span className={`inline-block transition-transform duration-150 ${showFilters ? 'rotate-90' : ''}`} aria-hidden="true">▶</span>
          Filters
          {hasActiveFilters && (
            <span className="text-action font-bold normal-case tracking-normal">
              {Object.keys(demoFilters).length} active
            </span>
          )}
        </button>
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {DEMO_KEYS.filter(k => k !== xAxis && k !== splitBy).map(demoKey => {
              const varDef = VAR_MAP.get(demoKey)!
              const values = demoUniqueValues[demoKey] ?? []
              const active = demoFilters[demoKey]
              return (
                <div key={demoKey}>
                  <span className="text-[13px] font-bold text-navy block mb-1.5">{varDef.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setDemoFilters(prev => {
                        const next = { ...prev }
                        delete next[demoKey]
                        return next
                      })}
                      className={`px-3 py-1.5 text-[13px] rounded-pill border transition-colors ${
                        !active || active.size === 0
                          ? 'bg-navy text-white border-navy font-bold'
                          : 'text-text-muted border-border hover:border-border-strong'
                      }`}
                    >
                      All
                    </button>
                    {values.map(val => (
                      <button
                        key={val}
                        onClick={() => toggleDemoFilter(demoKey, val)}
                        className={`px-3 py-1.5 text-[13px] rounded-pill border transition-colors ${
                          active?.has(val)
                            ? 'bg-amethyst-800 text-white border-amethyst-800 font-bold'
                            : 'text-text-muted border-border hover:border-border-strong'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            <label className="inline-flex items-center gap-2 cursor-pointer text-[13px] text-text select-none">
              <input
                type="checkbox"
                checked={includeP011}
                onChange={e => setIncludeP011(e.target.checked)}
                className="w-3.5 h-3.5 accent-amethyst"
              />
              Include P011 (EchoVision, not Ray-Ban Meta)
            </label>
            {hasActiveFilters && (
              <div>
                <button
                  onClick={clearFilters}
                  className="text-[13px] font-bold text-action hover:text-action-hover hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div ref={ref} className="card mb-4">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <span className="font-mono text-xs text-text-muted">
            {total.toLocaleString()} rows · {uniqueParticipants} participant{uniqueParticipants !== 1 ? 's' : ''}
          </span>
          {needsLimit && (
            <label className="flex items-center gap-2">
              <span className="font-mono text-xs text-text-muted">Show top</span>
              <input
                type="number"
                value={limit}
                onChange={e => setLimit(Math.max(1, Number(e.target.value) || 25))}
                className="text-[13px] w-16 border border-border-strong rounded-button px-2 py-1 bg-surface-raised text-text"
                min={1} max={500}
              />
            </label>
          )}
        </div>
        {chart}
      </div>

      {/* Summary */}
      <div className="card mb-4">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="flex items-center gap-2 font-mono text-xs tracking-[0.06em] uppercase text-text-muted hover:text-text w-full text-left py-1"
          aria-expanded={showSummary}
        >
          <span className={`inline-block transition-transform duration-150 ${showSummary ? 'rotate-90' : ''}`} aria-hidden="true">▶</span>
          Summary
        </button>
        {showSummary && (
          <div className="mt-4 pt-4 border-t border-border space-y-3 text-[14px] text-text">
            <div>
              <span className="font-bold text-navy">Y-axis:</span>{' '}
              <span className="font-bold">{metricDef.label}</span> — {metricDef.description}
            </div>
            <div>
              <span className="font-bold text-navy">X-axis:</span>{' '}
              <span className="font-bold">{xAxisDef.label}</span> — {xAxisDef.description}
              <br />
              <span className="text-text-muted text-[13px]">Measured: {xAxisDef.measurement}</span>
            </div>
            {splitByDef && (
              <div>
                <span className="font-bold text-navy">Split by:</span>{' '}
                <span className="font-bold">{splitByDef.label}</span> — {splitByDef.description}
                <br />
                <span className="text-text-muted text-[13px]">Measured: {splitByDef.measurement}</span>
              </div>
            )}
            <p className="text-text-muted text-[13px]">
              Based on {evidence.length.toLocaleString()} evidence segments from 17 semi-structured interviews with blind and low-vision users of consumer AI smart glasses.
            </p>
          </div>
        )}
      </div>

      {/* Data table */}
      <button
        onClick={() => setShowTable(!showTable)}
        className="text-[15px] font-bold text-action hover:text-action-hover hover:underline min-h-12 px-4 py-3 rounded-button border border-transparent hover:border-border"
        aria-expanded={showTable}
      >
        {showTable ? 'Hide data table' : 'Show data table'}
      </button>

      {showTable && barData && (
        <div className="mt-3 table-wrap overflow-y-auto" style={{ maxHeight: '60vh' }}>
          <div className="overflow-x-auto">
            <table className="text-[15px] w-full" style={{ borderCollapse: 'collapse' }}>
              <thead className="sticky top-0 bg-surface-sunk z-10">
                <tr className="border-b-2 border-border-strong">
                  <th scope="col" className="text-left px-4 py-3 font-bold text-navy-900 whitespace-nowrap">{xAxisDef.label}</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-navy-900 whitespace-nowrap">{metricDef.label}</th>
                </tr>
              </thead>
              <tbody>
                {barData.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-surface-sunk">
                    <td className="px-4 py-3 text-text max-w-xs truncate">{row.label}</td>
                    <td className="px-4 py-3 text-text tabular-nums">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTable && stackedData && (
        <div className="mt-3 table-wrap overflow-y-auto" style={{ maxHeight: '60vh' }}>
          <div className="overflow-x-auto">
            <table className="text-[15px] w-full" style={{ borderCollapse: 'collapse' }}>
              <thead className="sticky top-0 bg-surface-sunk z-10">
                <tr className="border-b-2 border-border-strong">
                  <th scope="col" className="text-left px-4 py-3 font-bold text-navy-900 whitespace-nowrap">{xAxisDef.label}</th>
                  {segKeys.map(k => (
                    <th key={k} scope="col" className="text-left px-4 py-3 font-bold text-navy-900 whitespace-nowrap">{k}</th>
                  ))}
                  <th scope="col" className="text-left px-4 py-3 font-bold text-navy-900 whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {stackedData.map((row, i) => {
                  const segMap = new Map(row.segments.map(s => [s.key, s.value]))
                  const rowTotal = row.segments.reduce((s, seg) => s + seg.value, 0)
                  return (
                    <tr key={i} className="border-b border-border hover:bg-surface-sunk">
                      <td className="px-4 py-3 text-text max-w-xs truncate">{row.label}</td>
                      {segKeys.map(k => (
                        <td key={k} className="px-4 py-3 text-text tabular-nums">{segMap.get(k) ?? 0}</td>
                      ))}
                      <td className="px-4 py-3 text-text font-bold tabular-nums">{rowTotal}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
