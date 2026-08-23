import {
  evidence,
  codebook,
  participants,
  themes,
  subthemes,
  verificationModes,
  feedbackSignals,
  painPoints,
  opportunities,
  contradictions,
  nonUse,
  comparison,
  insights,
  researchLimits,
  round3Results,
  round4Results,
} from './data'

export interface ColumnInfo {
  name: string
  type: 'numeric' | 'categorical' | 'participant'
}

export interface DatasetEntry {
  key: string
  label: string
  rows: Record<string, unknown>[]
  columns: ColumnInfo[]
}

const PID_RE = /^P\d{3}$/

function analyzeColumns(data: Record<string, unknown>[]): ColumnInfo[] {
  if (data.length === 0) return []
  const sample = data.slice(0, 20)
  return Object.keys(data[0]).map(name => {
    if (PID_RE.test(name)) return { name, type: 'participant' as const }
    const vals = sample.map(r => r[name]).filter(v => v != null && v !== '')
    const numCount = vals.filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '')).length
    if (vals.length > 0 && numCount >= vals.length * 0.7) return { name, type: 'numeric' as const }
    return { name, type: 'categorical' as const }
  })
}

function toRecords(arr: unknown[]): Record<string, unknown>[] {
  return arr as Record<string, unknown>[]
}

export const datasets: DatasetEntry[] = [
  { key: 'evidence', label: 'Evidence (2,146 rows)', rows: toRecords(evidence), columns: analyzeColumns(toRecords(evidence)) },
  { key: 'codebook', label: 'Codebook (361 codes)', rows: toRecords(codebook), columns: analyzeColumns(toRecords(codebook)) },
  { key: 'participants', label: 'Participants (17)', rows: toRecords(participants), columns: analyzeColumns(toRecords(participants)) },
  { key: 'themes', label: 'Themes (22)', rows: toRecords(themes), columns: analyzeColumns(toRecords(themes)) },
  { key: 'subthemes', label: 'Sub-themes (361)', rows: toRecords(subthemes), columns: analyzeColumns(toRecords(subthemes)) },
  { key: 'verification', label: 'Verification modes (28)', rows: toRecords(verificationModes), columns: analyzeColumns(toRecords(verificationModes)) },
  { key: 'feedback', label: 'Feedback signals (24)', rows: toRecords(feedbackSignals), columns: analyzeColumns(toRecords(feedbackSignals)) },
  { key: 'painPoints', label: 'Pain points (110)', rows: toRecords(painPoints), columns: analyzeColumns(toRecords(painPoints)) },
  { key: 'opportunities', label: 'Opportunities (111)', rows: toRecords(opportunities), columns: analyzeColumns(toRecords(opportunities)) },
  { key: 'contradictions', label: 'Contradictions (22)', rows: contradictions, columns: analyzeColumns(contradictions) },
  { key: 'nonUse', label: 'Non-use reasons (53)', rows: nonUse, columns: analyzeColumns(nonUse) },
  { key: 'comparison', label: 'Participant comparison (115)', rows: comparison, columns: analyzeColumns(comparison) },
  { key: 'insights', label: 'Insights & clusters (110)', rows: insights, columns: analyzeColumns(insights) },
  { key: 'researchLimits', label: 'Research limits (55)', rows: researchLimits, columns: analyzeColumns(researchLimits) },
  { key: 'round3', label: 'Round 3 results (51)', rows: round3Results, columns: analyzeColumns(round3Results) },
  { key: 'round4', label: 'Round 4 results (27)', rows: round4Results, columns: analyzeColumns(round4Results) },
]

export type ChartType = 'bar' | 'pie' | 'stacked' | 'clustered' | 'scatter' | 'heatmap' | 'treemap'

export const CHART_TYPES: { key: ChartType; label: string; needs: string }[] = [
  { key: 'bar', label: 'Bar', needs: '1 label + 1 value' },
  { key: 'pie', label: 'Pie', needs: '1 label + 1 value' },
  { key: 'treemap', label: 'Treemap', needs: '1 label + 1 value' },
  { key: 'stacked', label: 'Stacked bar', needs: '1 label + 1 value + 1 group' },
  { key: 'clustered', label: 'Clustered bar', needs: '1 label + 1 value + 1 group' },
  { key: 'scatter', label: 'Scatter', needs: '2 numeric columns' },
  { key: 'heatmap', label: 'Heat map', needs: '2 categorical + 1 value' },
]
