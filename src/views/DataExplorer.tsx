import { useState, useMemo, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { buildDrillUrl } from '@/lib/drilldown'
import { useSelection } from '@/lib/selection'
import { useContainerWidth } from '@/lib/useContainerWidth'
import { participants, themes, feedbackSignals, verificationModes, codebook, subthemes, comparison } from '@/lib/data'
import { BarChart, PieChart, StackedBarChart, ClusteredBarChart, TreeMap } from '@/charts'
import type { BarDatum, StackedDatum, ChartClickItem } from '@/charts'
import { AxisPicker } from '@/components/AxisPicker'

type ChartKind = 'bar' | 'stacked' | 'clustered' | 'pie' | 'donut' | 'treemap'
type Metric = 'participants' | 'total'
type DemoKey = 'ageGroup' | 'gender' | 'visionLevel' | 'education' | 'employment' | 'deviceTenure' | 'mobility'

const DEMO_KEYS: DemoKey[] = ['ageGroup', 'gender', 'visionLevel', 'education', 'employment', 'deviceTenure', 'mobility']
const PID_KEYS = participants.map(p => p.id)

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

const DEMO_LABELS: Record<DemoKey, string> = {
  ageGroup: 'Age group', gender: 'Gender', visionLevel: 'Vision level',
  education: 'Education', employment: 'Employment', deviceTenure: 'Device tenure', mobility: 'Mobility aid',
}

const DEMO_ORDER: Record<DemoKey, string[]> = {
  ageGroup: ['18–34', '35–54', '55+'],
  gender: ['Female', 'Male'],
  visionLevel: ['Totally blind', 'Low vision', 'Light perception'],
  education: ['High school', 'Some college', "Bachelor's", 'Graduate'],
  employment: ['Employed', 'Retired', 'Not employed'],
  deviceTenure: ['< 6 months', '6–12 months', '1–2 years', '2+ years'],
  mobility: ['Cane', 'Guide dog', 'Wheelchair', 'Minimal'],
}

function demoUniqueValues(): Record<DemoKey, string[]> {
  const result = {} as Record<DemoKey, string[]>
  for (const key of DEMO_KEYS) {
    const vals = new Set<string>()
    for (const [, demo] of demoMap) vals.add(demo[key])
    result[key] = DEMO_ORDER[key] ?? [...vals].sort()
  }
  return result
}

const DEMO_VALUES = demoUniqueValues()

interface DataItem {
  key: string
  label: string
  values: Map<string, number>
  rawValues?: Map<string, string>
}

interface DataGroup {
  key: string
  label: string
  source: 'comparison' | 'research'
  items: DataItem[]
}

function classifyValue(raw: unknown): number {
  if (raw == null || raw === '') return 0
  const s = String(raw)
  if (s.startsWith('Yes')) return 1
  if (s.startsWith('Partly')) return 1
  if (typeof raw === 'number' && raw > 0) return 1
  return 0
}

function buildComparisonGroups(): DataGroup[] {
  const groupMap = new Map<string, DataItem[]>()
  const groupOrder: string[] = []
  for (const row of comparison) {
    const group = String(row.Group ?? '')
    const attr = String(row.Attribute ?? '')
    if (!group || !attr) continue
    const values = new Map<string, number>()
    const rawValues = new Map<string, string>()
    for (const pid of PID_KEYS) {
      values.set(pid, classifyValue(row[pid]))
      rawValues.set(pid, String(row[pid] ?? ''))
    }
    if (!groupMap.has(group)) { groupMap.set(group, []); groupOrder.push(group) }
    groupMap.get(group)!.push({ key: `c|${group}|${attr}`, label: attr, values, rawValues })
  }
  return groupOrder.map(group => ({
    key: `c|${group}`,
    label: group,
    source: 'comparison' as const,
    items: groupMap.get(group)!,
  }))
}

function pidValues(row: Record<string, unknown>): Map<string, number> {
  return new Map(PID_KEYS.map(pid => [pid, Number(row[pid as keyof typeof row]) || 0]))
}

function buildResearchGroups(): DataGroup[] {
  return [
    {
      key: 'r|themes',
      label: 'Evidence themes',
      source: 'research',
      items: themes.map(t => ({ key: `r|t|${t.Theme}`, label: t.Name, values: pidValues(t) })),
    },
    {
      key: 'r|signals',
      label: 'Feedback signals',
      source: 'research',
      items: feedbackSignals.map(s => ({ key: `r|s|${s.Tag}`, label: s['Signal the user needs'], values: pidValues(s) })),
    },
    {
      key: 'r|verification',
      label: 'Verification failures',
      source: 'research',
      items: verificationModes.map(v => ({ key: `r|v|${v.Tag}`, label: v['Failure mode'], values: pidValues(v) })),
    },
    {
      key: 'r|codebook',
      label: 'Codebook codes',
      source: 'research',
      items: [...codebook]
        .sort((a, b) => (b.Total ?? 0) - (a.Total ?? 0))
        .map(c => ({ key: `r|c|${c.Code}`, label: c.Label || c.Code, values: pidValues(c) })),
    },
    {
      key: 'r|subthemes',
      label: 'Sub-themes',
      source: 'research',
      items: [...subthemes]
        .sort((a, b) => ((b['Coded quotes'] ?? 0) as number) - ((a['Coded quotes'] ?? 0) as number))
        .map(st => ({ key: `r|st|${st['Sub-theme']}`, label: st['Sub-theme'], values: pidValues(st) })),
    },
  ]
}

const ALL_GROUPS: DataGroup[] = [...buildComparisonGroups(), ...buildResearchGroups()]
const GROUP_MAP = new Map(ALL_GROUPS.map(g => [g.key, g]))

interface Suggestion {
  label: string
  groupKey: string
  itemKey: string | null
  crossTab: DemoKey | null
}

const SUGGESTIONS: Suggestion[] = [
  { label: 'Device use patterns', groupKey: 'c|Device use', itemKey: null, crossTab: null },
  { label: 'Trust & verification', groupKey: 'c|Trust & verification', itemKey: null, crossTab: null },
  { label: 'Privacy concerns', groupKey: 'c|Privacy', itemKey: null, crossTab: null },
  { label: 'Social perception by gender', groupKey: 'c|Social perception', itemKey: null, crossTab: 'gender' },
  { label: 'Evidence themes', groupKey: 'r|themes', itemKey: null, crossTab: null },
  { label: 'Themes by age', groupKey: 'r|themes', itemKey: null, crossTab: 'ageGroup' },
  { label: 'Themes by vision', groupKey: 'r|themes', itemKey: null, crossTab: 'visionLevel' },
  { label: 'Failure modes', groupKey: 'r|verification', itemKey: null, crossTab: null },
]

function getFilteredPids(demoFilters: Record<string, Set<string>>, includeP011: boolean): string[] {
  return PID_KEYS.filter(pid => {
    if (!includeP011 && pid === 'P011') return false
    const demo = demoMap.get(pid)
    if (!demo) return false
    for (const [key, allowed] of Object.entries(demoFilters)) {
      if (allowed.size > 0 && !allowed.has(demo[key as DemoKey])) return false
    }
    return true
  })
}

function itemMetric(item: DataItem, pids: string[], metric: Metric): number {
  if (metric === 'participants') return pids.filter(pid => (item.values.get(pid) ?? 0) > 0).length
  return pids.reduce((sum, pid) => sum + (item.values.get(pid) ?? 0), 0)
}

function computeGroupBars(items: DataItem[], pids: string[], metric: Metric): BarDatum[] {
  return items.map(item => ({ label: item.label, value: itemMetric(item, pids, metric) }))
}

function computeGroupStacked(items: DataItem[], pids: string[], crossTab: DemoKey, metric: Metric, swapped: boolean): StackedDatum[] {
  const demoGroups = new Map<string, string[]>()
  for (const pid of pids) {
    const dv = demoMap.get(pid)?.[crossTab] ?? 'Unknown'
    if (!demoGroups.has(dv)) demoGroups.set(dv, [])
    demoGroups.get(dv)!.push(pid)
  }

  if (swapped) {
    return Array.from(demoGroups.entries()).map(([demoVal, dPids]) => ({
      label: demoVal,
      segments: items.map(item => ({ key: item.label, value: itemMetric(item, dPids, metric) })),
    }))
  }

  return items.map(item => ({
    label: item.label,
    segments: Array.from(demoGroups.entries()).map(([key, dPids]) => ({
      key,
      value: itemMetric(item, dPids, metric),
    })),
  }))
}

function computeItemCrossTab(item: DataItem, pids: string[], crossTab: DemoKey, metric: Metric): BarDatum[] {
  const demoGroups = new Map<string, string[]>()
  for (const pid of pids) {
    const dv = demoMap.get(pid)?.[crossTab] ?? 'Unknown'
    if (!demoGroups.has(dv)) demoGroups.set(dv, [])
    demoGroups.get(dv)!.push(pid)
  }
  return Array.from(demoGroups.entries()).map(([label, dPids]) => ({
    label,
    value: itemMetric(item, dPids, metric),
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

const DEFAULT_LIMIT = 30
const CHART_KINDS: ChartKind[] = ['bar', 'stacked', 'clustered', 'pie', 'donut', 'treemap']

interface ExplorerData {
  barData: BarDatum[] | null
  stackedData: StackedDatum[] | null
  valueLabel: string
}

function computeExplorerData(
  group: DataGroup,
  selectedItem: DataItem | null,
  crossTab: DemoKey | null,
  swapped: boolean,
  metric: Metric,
  pids: string[],
  limit: number,
): ExplorerData {
  const vLabel = metric === 'participants' ? 'Participants' : 'Total count'

  if (selectedItem) {
    if (crossTab) {
      let data = computeItemCrossTab(selectedItem, pids, crossTab, metric)
      data = sortBar(data, DEMO_ORDER[crossTab])
      return { barData: data, stackedData: null, valueLabel: vLabel }
    }
    return { barData: [{ label: selectedItem.label, value: itemMetric(selectedItem, pids, metric) }], stackedData: null, valueLabel: vLabel }
  }

  let items = group.items
  if (items.length > limit) items = items.slice(0, limit)

  if (crossTab) {
    let data = computeGroupStacked(items, pids, crossTab, metric, swapped)
    const order = swapped ? DEMO_ORDER[crossTab] : undefined
    data = sortStacked(data, order)
    return { barData: null, stackedData: data, valueLabel: vLabel }
  }

  let data = computeGroupBars(items, pids, metric)
  data = sortBar(data)
  return { barData: data, stackedData: null, valueLabel: vLabel }
}

function renderChart(
  data: ExplorerData,
  chartKind: ChartKind,
  width: number,
  opts?: { onItemClick?: (item: ChartClickItem) => void; highlightedLabels?: string[] | null; onItemHover?: (label: string | null) => void },
) {
  if (width <= 0) return null
  const { barData, stackedData, valueLabel } = data
  const click = opts?.onItemClick
  const hl = opts?.highlightedLabels
  const hover = opts?.onItemHover
  if (stackedData) {
    if (chartKind === 'clustered') return <ClusteredBarChart data={stackedData} width={width} valueLabel={valueLabel} onItemClick={click} highlightedLabels={hl} />
    return <StackedBarChart data={stackedData} width={width} valueLabel={valueLabel} onItemClick={click} highlightedLabels={hl} />
  }
  if (barData && barData.length > 0) {
    if (chartKind === 'pie') return <PieChart data={barData} width={width} onItemClick={click} highlightedLabels={hl} onItemHover={hover} />
    if (chartKind === 'donut') return <PieChart data={barData} width={width} donut onItemClick={click} highlightedLabels={hl} onItemHover={hover} />
    if (chartKind === 'treemap') return <TreeMap data={barData} width={width} onItemClick={click} highlightedLabels={hl} onItemHover={hover} />
    return <BarChart data={barData} width={width} valueLabel={valueLabel} onItemClick={click} highlightedLabels={hl} onItemHover={hover} />
  }
  return <p className="text-[15px] text-text-muted">No data for this selection.</p>
}

function parseDemoFilters(params: URLSearchParams, prefix: string): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {}
  for (const key of DEMO_KEYS) {
    const raw = params.get(`${prefix}${key}`)
    if (raw) result[key] = new Set(raw.split(',').filter(Boolean))
  }
  return result
}

function parseExplorerParams(params: URLSearchParams) {
  const grp = params.get('grp')
  const groupKey = grp && GROUP_MAP.has(grp) ? grp : ALL_GROUPS[0].key
  const group = GROUP_MAP.get(groupKey) ?? ALL_GROUPS[0]

  const itemParam = params.get('item')
  const itemKey = itemParam && group.items.some(i => i.key === itemParam) ? itemParam : null

  const xt = params.get('xt')
  const crossTab = xt && (DEMO_KEYS as string[]).includes(xt) ? (xt as DemoKey) : null

  const ck = params.get('ck')
  const chartKind: ChartKind = ck && (CHART_KINDS as string[]).includes(ck) ? (ck as ChartKind) : 'bar'

  const metric: Metric = params.get('met') === 'total' ? 'total' : 'participants'

  const limParam = params.get('lim')
  const limit = limParam ? Math.max(1, Number(limParam) || DEFAULT_LIMIT) : DEFAULT_LIMIT

  return {
    groupKey,
    itemKey,
    crossTab,
    chartKind,
    metric,
    limit,
    swapped: params.get('sw') === '1',
    comparing: params.get('cmp') === '1',
    includeP011: params.get('dp011') === '1',
    includeP011B: params.get('dp011b') === '1',
    demoFilters: parseDemoFilters(params, 'df.'),
    demoFiltersB: parseDemoFilters(params, 'dfb.'),
  }
}

function CompactFilters({ demoFilters, setDemoFilters, includeP011, setIncludeP011, crossTab }: {
  demoFilters: Record<string, Set<string>>
  setDemoFilters: Dispatch<SetStateAction<Record<string, Set<string>>>>
  includeP011: boolean
  setIncludeP011: (v: boolean) => void
  crossTab: DemoKey | null
}) {
  const toggle = useCallback((key: string, value: string) => {
    setDemoFilters(prev => {
      const next = { ...prev }
      const current = next[key] ? new Set(next[key]) : new Set<string>()
      if (current.has(value)) current.delete(value)
      else current.add(value)
      if (current.size === 0) delete next[key]
      else next[key] = current
      return next
    })
  }, [setDemoFilters])

  return (
    <div className="flex flex-wrap gap-1.5">
      {DEMO_KEYS.filter(k => k !== crossTab).flatMap(demoKey =>
        DEMO_VALUES[demoKey].map(val => {
          const active = demoFilters[demoKey]?.has(val)
          return (
            <button
              key={`${demoKey}-${val}`}
              onClick={() => toggle(demoKey, val)}
              title={DEMO_LABELS[demoKey]}
              className={`px-2.5 py-1 text-[12px] rounded-pill border transition-colors ${
                active ? 'bg-amethyst-800 text-white border-amethyst-800 font-bold' : 'text-text-muted border-border hover:border-border-strong'
              }`}
            >{val}</button>
          )
        }),
      )}
      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[12px] text-text-muted select-none ml-1">
        <input type="checkbox" checked={includeP011} onChange={e => setIncludeP011(e.target.checked)} className="w-3 h-3 accent-amethyst" />
        +P011
      </label>
    </div>
  )
}

export function DataExplorer() {
  const navigate = useNavigate()
  const { selection, setSelection, clearSelection } = useSelection()
  const [refA, widthA] = useContainerWidth()
  const [refB, widthB] = useContainerWidth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [initial] = useState(() => parseExplorerParams(searchParams))

  const [groupKey, setGroupKey] = useState(initial.groupKey)
  const [itemKey, setItemKey] = useState<string | null>(initial.itemKey)
  const [crossTab, setCrossTab] = useState<DemoKey | null>(initial.crossTab)
  const [swapped, setSwapped] = useState(initial.swapped)
  const [chartKind, setChartKind] = useState<ChartKind>(initial.chartKind)
  const [metric, setMetric] = useState<Metric>(initial.metric)
  const [demoFilters, setDemoFilters] = useState<Record<string, Set<string>>>(initial.demoFilters)
  const [includeP011, setIncludeP011] = useState(initial.includeP011)
  const [comparing, setComparing] = useState(initial.comparing)
  const [demoFiltersB, setDemoFiltersB] = useState<Record<string, Set<string>>>(initial.demoFiltersB)
  const [includeP011B, setIncludeP011B] = useState(initial.includeP011B)
  const [showFilters, setShowFilters] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [limit, setLimit] = useState(initial.limit)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const group = GROUP_MAP.get(groupKey) ?? ALL_GROUPS[0]
  const selectedItem = itemKey ? group.items.find(i => i.key === itemKey) ?? null : null
  const isResearch = group.source === 'research'

  const handleGroupChange = useCallback((key: string) => {
    setGroupKey(key)
    setItemKey(null)
    setSwapped(false)
  }, [])

  const handleItemChange = useCallback((key: string) => {
    setItemKey(key || null)
    setSwapped(false)
  }, [])

  const applySuggestion = useCallback((s: Suggestion) => {
    setGroupKey(s.groupKey)
    setItemKey(s.itemKey)
    setCrossTab(s.crossTab)
    setSwapped(false)
    setDemoFilters({})
    setIncludeP011(false)
    setChartKind(s.crossTab && !s.itemKey ? 'stacked' : 'bar')
    setLimit(30)
  }, [])

  const handleCrossTabChange = useCallback((v: string) => {
    const ct = v ? (v as DemoKey) : null
    setCrossTab(ct)
    setSwapped(false)
    if (ct && !selectedItem && !['stacked', 'clustered'].includes(chartKind)) setChartKind('stacked')
    if (!ct && ['stacked', 'clustered'].includes(chartKind)) setChartKind('bar')
  }, [selectedItem, chartKind])

  const toggleDemoFilter = useCallback((key: string, value: string) => {
    setDemoFilters(prev => {
      const next = { ...prev }
      const current = next[key] ? new Set(next[key]) : new Set<string>()
      if (current.has(value)) current.delete(value)
      else current.add(value)
      if (current.size === 0) delete next[key]
      else next[key] = current
      return next
    })
  }, [])

  const clearFilters = useCallback(() => { setDemoFilters({}); setIncludeP011(false) }, [])
  const hasActiveFilters = Object.keys(demoFilters).length > 0 || includeP011

  const resetB = useCallback(() => {
    setDemoFiltersB(Object.fromEntries(Object.entries(demoFilters).map(([k, v]) => [k, new Set(v)])))
    setIncludeP011B(includeP011)
  }, [demoFilters, includeP011])

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    for (const k of ['grp', 'item', 'xt', 'ck', 'met', 'lim', 'sw', 'cmp', 'dp011', 'dp011b']) params.delete(k)
    for (const k of DEMO_KEYS) { params.delete(`df.${k}`); params.delete(`dfb.${k}`) }

    params.set('grp', groupKey)
    if (itemKey) params.set('item', itemKey)
    if (crossTab) params.set('xt', crossTab)
    params.set('ck', chartKind)
    params.set('met', metric)
    if (limit !== DEFAULT_LIMIT) params.set('lim', String(limit))
    if (swapped) params.set('sw', '1')
    if (comparing) params.set('cmp', '1')
    for (const [key, values] of Object.entries(demoFilters)) {
      if (values.size > 0) params.set(`df.${key}`, [...values].join(','))
    }
    if (includeP011) params.set('dp011', '1')
    if (comparing) {
      for (const [key, values] of Object.entries(demoFiltersB)) {
        if (values.size > 0) params.set(`dfb.${key}`, [...values].join(','))
      }
      if (includeP011B) params.set('dp011b', '1')
    }
    setSearchParams(params, { replace: true })
  }, [groupKey, itemKey, crossTab, chartKind, metric, limit, swapped, comparing, demoFilters, includeP011, demoFiltersB, includeP011B, setSearchParams])

  const pidsA = useMemo(() => getFilteredPids(demoFilters, includeP011), [demoFilters, includeP011])
  const pidsB = useMemo(() => getFilteredPids(demoFiltersB, includeP011B), [demoFiltersB, includeP011B])

  const groupOptions = useMemo(() =>
    ALL_GROUPS.map(g => ({
      value: g.key,
      label: `${g.label} (${g.items.length})`,
      group: g.source === 'comparison' ? 'Participant attributes' : 'Research data',
    })),
  [])

  const itemOptions = useMemo(() => [
    { value: '', label: `All in group (${group.items.length})` },
    ...group.items.map(i => ({ value: i.key, label: i.label })),
  ], [group])

  const crossTabOptions = useMemo(() => [
    { value: '', label: '(none)' },
    ...DEMO_KEYS.map(k => ({ value: k, label: DEMO_LABELS[k] })),
  ], [])

  const dataA = useMemo(
    () => computeExplorerData(group, selectedItem, crossTab, swapped, metric, pidsA, limit),
    [group, selectedItem, crossTab, swapped, metric, pidsA, limit],
  )
  const dataB = useMemo(
    () => comparing ? computeExplorerData(group, selectedItem, crossTab, swapped, metric, pidsB, limit) : null,
    [comparing, group, selectedItem, crossTab, swapped, metric, pidsB, limit],
  )
  const { barData, stackedData, valueLabel } = dataA

  const segKeys = useMemo(() => {
    if (!stackedData) return []
    const keys = [...new Set(stackedData.flatMap(d => d.segments.map(s => s.key)))]
    if (crossTab && !swapped) {
      const idx = new Map(DEMO_ORDER[crossTab]?.map((v, i) => [v, i]) ?? [])
      return keys.sort((a, b) => (idx.get(a) ?? 999) - (idx.get(b) ?? 999))
    }
    return keys.sort()
  }, [stackedData, crossTab, swapped])

  const canSwap = crossTab != null && !selectedItem
  const isGroupView = !selectedItem

  const chartKindOptions: { key: ChartKind; label: string }[] = stackedData
    ? [{ key: 'stacked', label: 'Stacked' }, { key: 'clustered', label: 'Clustered' }]
    : [{ key: 'bar', label: 'Bar' }, { key: 'pie', label: 'Pie' }, { key: 'donut', label: 'Donut' }, { key: 'treemap', label: 'Treemap' }]

  const handleItemClick = useCallback((item: ChartClickItem) => {
    const dataItem = group.items.find(i => i.label === item.label)
    if (!dataItem) { navigate(buildDrillUrl({ search: item.label })); return }
    const key = dataItem.key
    if (key.startsWith('r|t|')) {
      navigate(buildDrillUrl({ theme: key.slice(4) }))
    } else if (key.startsWith('r|c|')) {
      navigate(buildDrillUrl({ code: key.slice(4) }))
    } else if (key.startsWith('r|s|')) {
      const signal = feedbackSignals.find(s => s.Tag === key.slice(4))
      navigate(buildDrillUrl(signal?.codes.length ? { code: signal.codes } : { search: item.label }))
    } else if (key.startsWith('r|v|')) {
      const mode = verificationModes.find(v => v.Tag === key.slice(4))
      navigate(buildDrillUrl(mode?.mode_codes.length ? { code: mode.mode_codes } : { search: item.label }))
    } else {
      navigate(buildDrillUrl({ search: item.label }))
    }
  }, [navigate, group])

  const handleItemHover = useCallback((label: string | null) => {
    if (label) setSelection([label], 'explorer')
    else clearSelection()
  }, [setSelection, clearSelection])

  const highlightedLabels = selection.labels.length > 0 ? selection.labels : null

  const chartA = useMemo(() => renderChart(dataA, chartKind, widthA, {
    onItemClick: handleItemClick, highlightedLabels, onItemHover: handleItemHover,
  }), [dataA, chartKind, widthA, handleItemClick, highlightedLabels, handleItemHover])
  const chartB = useMemo(
    () => comparing && dataB ? renderChart(dataB, chartKind, widthB, {
      onItemClick: handleItemClick, highlightedLabels, onItemHover: handleItemHover,
    }) : null,
    [comparing, dataB, chartKind, widthB, handleItemClick, highlightedLabels, handleItemHover],
  )

  const isSuggestionActive = (s: Suggestion) => groupKey === s.groupKey && itemKey === s.itemKey && crossTab === s.crossTab

  return (
    <section aria-labelledby="explorer-heading">
      <div className="mb-6">
        <p className="section-label">07 — Data explorer</p>
        <h1 id="explorer-heading" className="section-heading">
          Explore the research data, your way.
        </h1>
        <p className="body-lg">
          Pick a category, drill into data points, and cross-tabulate by demographics.
          The visualization updates as you change variables.
        </p>
      </div>

      <div className="mb-6">
        <span className="font-mono text-xs tracking-[0.06em] uppercase text-text-muted block mb-2">Suggestions</span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s.label}
              onClick={() => applySuggestion(s)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[14px] rounded-button border transition-colors ${
                isSuggestionActive(s)
                  ? 'bg-navy text-white border-navy font-bold'
                  : 'text-text-muted border-border hover:border-border-strong hover:bg-surface-sunk'
              }`}
            >
              <span className={`text-[11px] font-bold tracking-wide uppercase shrink-0 ${
                isSuggestionActive(s) ? 'text-sand' : 'text-action'
              }`}>Show&nbsp;me</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-4">
        <span className="font-mono text-xs tracking-[0.06em] uppercase text-text-muted block mb-3">Y-axis · data points</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AxisPicker label="Category" value={groupKey} onChange={handleGroupChange} options={groupOptions} placeholder="Search categories…" />
          <AxisPicker label="Data point" value={itemKey ?? ''} onChange={handleItemChange} options={itemOptions} placeholder="Search data points…" />
        </div>
        {isResearch && (
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => setMetric('participants')}
              className={`px-3 py-1.5 text-[13px] rounded-pill border transition-colors ${
                metric === 'participants' ? 'bg-navy text-white border-navy font-bold' : 'text-text-muted border-border'
              }`}
            >Count participants</button>
            <button
              onClick={() => setMetric('total')}
              className={`px-3 py-1.5 text-[13px] rounded-pill border transition-colors ${
                metric === 'total' ? 'bg-navy text-white border-navy font-bold' : 'text-text-muted border-border'
              }`}
            >Sum of values</button>
          </div>
        )}
      </div>

      <div className="card mb-4">
        <span className="font-mono text-xs tracking-[0.06em] uppercase text-text-muted block mb-3">X-axis · cross-tabulate by</span>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <AxisPicker label="Demographic variable" value={crossTab ?? ''} onChange={handleCrossTabChange} options={crossTabOptions} placeholder="Search demographics…" />
          </div>
          <button
            onClick={() => setSwapped(s => !s)}
            disabled={!canSwap}
            className="min-h-12 px-4 py-2.5 rounded-button border border-border-strong text-text-muted hover:bg-surface-sunk hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-mono text-sm"
            title="Swap data points and demographics on the axes"
            aria-label="Swap axes"
          >&#8644; Swap</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
            >{t.label}</button>
          ))}
        </div>
        <button
          onClick={() => setComparing(c => !c)}
          aria-pressed={comparing}
          className={`px-4 py-2 text-[14px] rounded-button min-h-9 border transition-colors ${
            comparing
              ? 'bg-navy text-white font-bold border-navy'
              : 'text-text-muted hover:bg-surface-sunk border-border hover:border-border-strong'
          }`}
        >Compare</button>
        {comparing && (
          <button
            onClick={resetB}
            className="px-4 py-2 text-[14px] rounded-button min-h-9 border border-border text-text-muted hover:bg-surface-sunk hover:border-border-strong transition-colors"
          >Reset B</button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {isGroupView && group.items.length > 10 && (
            <label className="flex items-center gap-2">
              <span className="font-mono text-xs text-text-muted">Show top</span>
              <input
                type="number"
                value={limit}
                onChange={e => setLimit(Math.max(1, Number(e.target.value) || 30))}
                className="text-[13px] w-16 border border-border-strong rounded-button px-2 py-1 bg-surface-raised text-text"
                min={1} max={500}
              />
            </label>
          )}
          <button
            onClick={handleShare}
            className="min-h-9 px-4 py-2 text-[14px] rounded-button border border-border-strong text-action hover:text-action-hover hover:bg-surface-sunk transition-colors"
          >{copied ? 'Copied!' : 'Share'}</button>
        </div>
      </div>

      {!comparing && (
        <div className="card mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 font-mono text-xs tracking-[0.06em] uppercase text-text-muted hover:text-text w-full text-left py-1"
            aria-expanded={showFilters}
          >
            <span className={`inline-block transition-transform duration-150 ${showFilters ? 'rotate-90' : ''}`} aria-hidden="true">&#9654;</span>
            Filters
            {hasActiveFilters && <span className="text-action font-bold normal-case tracking-normal">{Object.keys(demoFilters).length} active</span>}
          </button>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              {DEMO_KEYS.filter(k => k !== crossTab).map(demoKey => {
                const values = DEMO_VALUES[demoKey]
                const active = demoFilters[demoKey]
                return (
                  <div key={demoKey}>
                    <span className="text-[13px] font-bold text-navy block mb-1.5">{DEMO_LABELS[demoKey]}</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setDemoFilters(prev => { const n = { ...prev }; delete n[demoKey]; return n })}
                        className={`px-3 py-1.5 text-[13px] rounded-pill border transition-colors ${
                          !active || active.size === 0
                            ? 'bg-navy text-white border-navy font-bold'
                            : 'text-text-muted border-border hover:border-border-strong'
                        }`}
                      >All</button>
                      {values.map(val => (
                        <button
                          key={val}
                          onClick={() => toggleDemoFilter(demoKey, val)}
                          className={`px-3 py-1.5 text-[13px] rounded-pill border transition-colors ${
                            active?.has(val)
                              ? 'bg-amethyst-800 text-white border-amethyst-800 font-bold'
                              : 'text-text-muted border-border hover:border-border-strong'
                          }`}
                        >{val}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
              <label className="inline-flex items-center gap-2 cursor-pointer text-[13px] text-text select-none">
                <input type="checkbox" checked={includeP011} onChange={e => setIncludeP011(e.target.checked)} className="w-3.5 h-3.5 accent-amethyst" />
                Include P011 (EchoVision, not Ray-Ban Meta)
              </label>
              {hasActiveFilters && (
                <div>
                  <button onClick={clearFilters} className="text-[13px] font-bold text-action hover:text-action-hover hover:underline">Clear all filters</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {comparing ? (
        <div className="card mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={refA}>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-navy text-white text-[11px] font-bold shrink-0">A</span>
                <span className="font-mono text-xs text-text-muted">{pidsA.length} participant{pidsA.length !== 1 ? 's' : ''}</span>
              </div>
              <CompactFilters demoFilters={demoFilters} setDemoFilters={setDemoFilters} includeP011={includeP011} setIncludeP011={setIncludeP011} crossTab={crossTab} />
              <div className="mt-3">{chartA}</div>
            </div>
            <div ref={refB}>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amethyst-800 text-white text-[11px] font-bold shrink-0">B</span>
                <span className="font-mono text-xs text-text-muted">{pidsB.length} participant{pidsB.length !== 1 ? 's' : ''}</span>
              </div>
              <CompactFilters demoFilters={demoFiltersB} setDemoFilters={setDemoFiltersB} includeP011={includeP011B} setIncludeP011={setIncludeP011B} crossTab={crossTab} />
              <div className="mt-3">{chartB}</div>
            </div>
          </div>
        </div>
      ) : (
        <div ref={refA} className="card mb-4">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <span className="font-mono text-xs text-text-muted">
              {pidsA.length} participant{pidsA.length !== 1 ? 's' : ''}
              {isGroupView && <> &middot; {Math.min(group.items.length, limit)} of {group.items.length} data points</>}
            </span>
          </div>
          {chartA}
        </div>
      )}

      <div className="card mb-4">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="flex items-center gap-2 font-mono text-xs tracking-[0.06em] uppercase text-text-muted hover:text-text w-full text-left py-1"
          aria-expanded={showSummary}
        >
          <span className={`inline-block transition-transform duration-150 ${showSummary ? 'rotate-90' : ''}`} aria-hidden="true">&#9654;</span>
          Summary
        </button>
        {showSummary && (
          <div className="mt-4 pt-4 border-t border-border space-y-3 text-[14px] text-text">
            <div>
              <span className="font-bold text-navy">Category:</span>{' '}
              {group.label}
              {group.source === 'comparison' && <span className="text-text-muted"> — participant attributes from the comparison matrix</span>}
              {group.source === 'research' && <span className="text-text-muted"> — coded from 17 semi-structured interviews</span>}
            </div>
            {selectedItem && (
              <div>
                <span className="font-bold text-navy">Data point:</span>{' '}
                {selectedItem.label}
                <span className="text-text-muted"> — {itemMetric(selectedItem, pidsA, 'participants')} of {pidsA.length} participants</span>
              </div>
            )}
            {crossTab && (
              <div>
                <span className="font-bold text-navy">Cross-tabulated by:</span>{' '}
                {DEMO_LABELS[crossTab]}
                <span className="text-text-muted"> — self-reported during interview</span>
              </div>
            )}
            <p className="text-text-muted text-[13px]">
              Based on 17 semi-structured interviews with blind and low-vision users of consumer AI smart glasses.
              {group.source === 'comparison' && ' Values are classified as Yes, Partly (counted as present), or No from participant responses.'}
            </p>
          </div>
        )}
      </div>

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
                  <th scope="col" className="text-left px-4 py-3 font-bold text-navy-900 whitespace-nowrap">
                    {selectedItem && crossTab ? DEMO_LABELS[crossTab] : 'Data point'}
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-navy-900 whitespace-nowrap">{valueLabel}</th>
                </tr>
              </thead>
              <tbody>
                {barData.map((row, i) => (
                  <tr key={i} className={`border-b border-border hover:bg-surface-sunk${highlightedLabels?.includes(row.label) ? ' bg-cornflower/10' : ''}`}>
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
                  <th scope="col" className="text-left px-4 py-3 font-bold text-navy-900 whitespace-nowrap">
                    {swapped ? DEMO_LABELS[crossTab!] : 'Data point'}
                  </th>
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
                    <tr key={i} className={`border-b border-border hover:bg-surface-sunk${highlightedLabels?.includes(row.label) ? ' bg-cornflower/10' : ''}`}>
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
