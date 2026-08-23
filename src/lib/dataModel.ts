import {
  evidence,
  codebook,
  themes,
  subthemes,
  verificationModes,
  feedbackSignals,
  painPoints,
  opportunities,
} from './data'
import type {
  EvidenceRow,
  CodebookEntry,
  ThemeEntry,
  SubThemeEntry,
  VerificationMode,
  FeedbackSignal,
  PainPoint,
  Opportunity,
} from './types'

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const arr = map.get(key)
  if (arr) arr.push(value)
  else map.set(key, [value])
}

function parseList(s: string | null | undefined): string[] {
  if (!s) return []
  return s.split(/,\s*/).map(t => t.trim()).filter(Boolean)
}

function dedupe<T>(items: T[], key: keyof T): T[] {
  const seen = new Set<unknown>()
  return items.filter(item => {
    const k = item[key]
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function uniquePids(rows: EvidenceRow[]): string[] {
  return [...new Set(rows.map(r => r.Who))].sort()
}

// ── Index Maps (built once at import) ──

export const evidenceByParticipant = new Map<string, EvidenceRow[]>()
export const evidenceByTheme = new Map<string, EvidenceRow[]>()
export const evidenceByCode = new Map<string, EvidenceRow[]>()
export const evidenceBySubtheme = new Map<string, EvidenceRow[]>()

for (const row of evidence) {
  pushTo(evidenceByParticipant, row.Who, row)
  pushTo(evidenceByTheme, row.Theme, row)
  pushTo(evidenceByCode, row.Code, row)
  pushTo(evidenceBySubtheme, `${row.Theme}::${row['Sub-theme']}`, row)
}

export const codebookByCode = new Map<string, CodebookEntry>()
export const codebookByTheme = new Map<string, CodebookEntry[]>()
for (const entry of codebook) {
  codebookByCode.set(entry.Code, entry)
  pushTo(codebookByTheme, entry.Theme, entry)
}

export const themeById = new Map<string, ThemeEntry>()
for (const t of themes) themeById.set(t.Theme, t)

export const subthemesByTheme = new Map<string, SubThemeEntry[]>()
for (const st of subthemes) pushTo(subthemesByTheme, st.Theme, st)

export const painPointByTag = new Map<string, PainPoint>()
export const painPointsByTheme = new Map<string, PainPoint[]>()
export const painPointsByCode = new Map<string, PainPoint[]>()
for (const pp of painPoints) {
  painPointByTag.set(pp.Tag, pp)
  for (const t of parseList(pp.Theme)) pushTo(painPointsByTheme, t, pp)
  for (const c of parseList(pp['Evidence codes'])) pushTo(painPointsByCode, c, pp)
}

export const opportunityByTag = new Map<string, Opportunity>()
export const opportunitiesByPainPoint = new Map<string, Opportunity[]>()
export const opportunitiesByTheme = new Map<string, Opportunity[]>()
for (const opp of opportunities) {
  opportunityByTag.set(opp.Tag, opp)
  for (const ppTag of parseList(opp.Fixes)) pushTo(opportunitiesByPainPoint, ppTag, opp)
  for (const t of parseList(opp.Theme)) pushTo(opportunitiesByTheme, t, opp)
}

export const vaModeByTag = new Map<string, VerificationMode>()
export const vaModesByCode = new Map<string, VerificationMode[]>()
for (const va of verificationModes) {
  vaModeByTag.set(va.Tag, va)
  for (const code of va.mode_codes) pushTo(vaModesByCode, code, va)
}

export const feedbackByTag = new Map<string, FeedbackSignal>()
export const feedbackByCode = new Map<string, FeedbackSignal[]>()
for (const fb of feedbackSignals) {
  feedbackByTag.set(fb.Tag, fb)
  for (const code of fb.codes) pushTo(feedbackByCode, code, fb)
}

// ── Query interface ──

export interface LinkedData {
  evidence: EvidenceRow[]
  codes: CodebookEntry[]
  themes: ThemeEntry[]
  subthemes: SubThemeEntry[]
  painPoints: PainPoint[]
  opportunities: Opportunity[]
  verificationModes: VerificationMode[]
  feedbackSignals: FeedbackSignal[]
  participants: string[]
}

const EMPTY: LinkedData = {
  evidence: [], codes: [], themes: [], subthemes: [],
  painPoints: [], opportunities: [],
  verificationModes: [], feedbackSignals: [], participants: [],
}

export function linkedToTheme(themeId: string): LinkedData {
  const ev = evidenceByTheme.get(themeId) ?? []
  const codes = codebookByTheme.get(themeId) ?? []
  const subs = subthemesByTheme.get(themeId) ?? []
  const pps = painPointsByTheme.get(themeId) ?? []
  const opps = dedupe([
    ...(opportunitiesByTheme.get(themeId) ?? []),
    ...pps.flatMap(pp => opportunitiesByPainPoint.get(pp.Tag) ?? []),
  ], 'Tag')
  const codeIds = codes.map(c => c.Code)
  const vas = dedupe(codeIds.flatMap(c => vaModesByCode.get(c) ?? []), 'Tag')
  const fbs = dedupe(codeIds.flatMap(c => feedbackByCode.get(c) ?? []), 'Tag')
  const theme = themeById.get(themeId)
  return {
    evidence: ev,
    codes,
    themes: theme ? [theme] : [],
    subthemes: subs,
    painPoints: pps,
    opportunities: opps,
    verificationModes: vas,
    feedbackSignals: fbs,
    participants: uniquePids(ev),
  }
}

export function linkedToCode(code: string): LinkedData {
  const ev = evidenceByCode.get(code) ?? []
  const entry = codebookByCode.get(code)
  if (!entry) return { ...EMPTY, evidence: ev, participants: uniquePids(ev) }
  const theme = themeById.get(entry.Theme)
  const sub = (subthemesByTheme.get(entry.Theme) ?? []).filter(
    s => s['Sub-theme'] === entry['Sub-theme'],
  )
  const pps = painPointsByCode.get(code) ?? []
  const opps = dedupe(pps.flatMap(pp => opportunitiesByPainPoint.get(pp.Tag) ?? []), 'Tag')
  return {
    evidence: ev,
    codes: [entry],
    themes: theme ? [theme] : [],
    subthemes: sub,
    painPoints: pps,
    opportunities: opps,
    verificationModes: vaModesByCode.get(code) ?? [],
    feedbackSignals: feedbackByCode.get(code) ?? [],
    participants: uniquePids(ev),
  }
}

export function linkedToParticipant(pid: string): LinkedData {
  const ev = evidenceByParticipant.get(pid) ?? []
  const themeIds = [...new Set(ev.map(r => r.Theme))]
  const codeIds = [...new Set(ev.map(r => r.Code))]
  return {
    evidence: ev,
    codes: codeIds.map(c => codebookByCode.get(c)).filter(Boolean) as CodebookEntry[],
    themes: themeIds.map(t => themeById.get(t)).filter(Boolean) as ThemeEntry[],
    subthemes: [],
    painPoints: dedupe(codeIds.flatMap(c => painPointsByCode.get(c) ?? []), 'Tag'),
    opportunities: [],
    verificationModes: dedupe(codeIds.flatMap(c => vaModesByCode.get(c) ?? []), 'Tag'),
    feedbackSignals: dedupe(codeIds.flatMap(c => feedbackByCode.get(c) ?? []), 'Tag'),
    participants: [pid],
  }
}

export function linkedToPainPoint(tag: string): LinkedData {
  const pp = painPointByTag.get(tag)
  if (!pp) return EMPTY
  const codeIds = parseList(pp['Evidence codes'])
  const ev = codeIds.flatMap(c => evidenceByCode.get(c) ?? [])
  const themeIds = parseList(pp.Theme)
  return {
    evidence: ev,
    codes: codeIds.map(c => codebookByCode.get(c)).filter(Boolean) as CodebookEntry[],
    themes: themeIds.map(t => themeById.get(t)).filter(Boolean) as ThemeEntry[],
    subthemes: [],
    painPoints: [pp],
    opportunities: opportunitiesByPainPoint.get(tag) ?? [],
    verificationModes: dedupe(codeIds.flatMap(c => vaModesByCode.get(c) ?? []), 'Tag'),
    feedbackSignals: dedupe(codeIds.flatMap(c => feedbackByCode.get(c) ?? []), 'Tag'),
    participants: uniquePids(ev),
  }
}

export function linkedToOpportunity(tag: string): LinkedData {
  const opp = opportunityByTag.get(tag)
  if (!opp) return EMPTY
  const ppTags = parseList(opp.Fixes)
  const pps = ppTags.map(t => painPointByTag.get(t)).filter(Boolean) as PainPoint[]
  const codeIds = [...new Set(pps.flatMap(pp => parseList(pp['Evidence codes'])))]
  const ev = codeIds.flatMap(c => evidenceByCode.get(c) ?? [])
  const themeIds = parseList(opp.Theme)
  return {
    evidence: ev,
    codes: codeIds.map(c => codebookByCode.get(c)).filter(Boolean) as CodebookEntry[],
    themes: themeIds.map(t => themeById.get(t)).filter(Boolean) as ThemeEntry[],
    subthemes: [],
    painPoints: pps,
    opportunities: [opp],
    verificationModes: dedupe(codeIds.flatMap(c => vaModesByCode.get(c) ?? []), 'Tag'),
    feedbackSignals: dedupe(codeIds.flatMap(c => feedbackByCode.get(c) ?? []), 'Tag'),
    participants: uniquePids(ev),
  }
}

export function linkedToVerificationMode(tag: string): LinkedData {
  const va = vaModeByTag.get(tag)
  if (!va) return EMPTY
  const codeIds = va.mode_codes
  const ev = codeIds.flatMap(c => evidenceByCode.get(c) ?? [])
  const entries = codeIds.map(c => codebookByCode.get(c)).filter(Boolean) as CodebookEntry[]
  const themeIds = [...new Set(entries.map(c => c.Theme))]
  const pps = dedupe(codeIds.flatMap(c => painPointsByCode.get(c) ?? []), 'Tag')
  return {
    evidence: ev,
    codes: entries,
    themes: themeIds.map(t => themeById.get(t)).filter(Boolean) as ThemeEntry[],
    subthemes: [],
    painPoints: pps,
    opportunities: dedupe(pps.flatMap(pp => opportunitiesByPainPoint.get(pp.Tag) ?? []), 'Tag'),
    verificationModes: [va],
    feedbackSignals: dedupe(codeIds.flatMap(c => feedbackByCode.get(c) ?? []), 'Tag'),
    participants: uniquePids(ev),
  }
}

export function linkedToFeedbackSignal(tag: string): LinkedData {
  const fb = feedbackByTag.get(tag)
  if (!fb) return EMPTY
  const codeIds = fb.codes
  const ev = codeIds.flatMap(c => evidenceByCode.get(c) ?? [])
  const entries = codeIds.map(c => codebookByCode.get(c)).filter(Boolean) as CodebookEntry[]
  const themeIds = [...new Set(entries.map(c => c.Theme))]
  const pps = dedupe(codeIds.flatMap(c => painPointsByCode.get(c) ?? []), 'Tag')
  return {
    evidence: ev,
    codes: entries,
    themes: themeIds.map(t => themeById.get(t)).filter(Boolean) as ThemeEntry[],
    subthemes: [],
    painPoints: pps,
    opportunities: dedupe(pps.flatMap(pp => opportunitiesByPainPoint.get(pp.Tag) ?? []), 'Tag'),
    verificationModes: dedupe(codeIds.flatMap(c => vaModesByCode.get(c) ?? []), 'Tag'),
    feedbackSignals: [fb],
    participants: uniquePids(ev),
  }
}
