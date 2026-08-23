import type {
  EvidenceRow,
  CodebookEntry,
  Participant,
  ThemeEntry,
  SubThemeEntry,
  VerificationMode,
  FeedbackSignal,
  PainPoint,
  Opportunity,
  ChartSpec,
  HeadlineBlock,
} from './types'

import evidenceJson from '../../data/evidence.json'
import codebookJson from '../../data/codebook.json'
import participantsJson from '../../data/participants.json'
import themesJson from '../../data/themes.json'
import subthemesJson from '../../data/subthemes.json'
import verificationJson from '../../data/verification.json'
import feedbackJson from '../../data/feedback.json'
import painPointsJson from '../../data/pain_points.json'
import opportunitiesJson from '../../data/opportunities.json'
import contradictionsJson from '../../data/contradictions.json'
import nonUseJson from '../../data/non_use.json'
import comparisonJson from '../../data/comparison.json'
import insightsJson from '../../data/insights.json'
import researchLimitsJson from '../../data/research_limits.json'
import round3Json from '../../data/round3_results.json'
import round4Json from '../../data/round4_results.json'
import headlineJson from '../../data/headline.json'
import altTextJson from '../../data/alt_text.json'

import chart01 from '../../data/charts/chart-01.json'
import chart02 from '../../data/charts/chart-02.json'
import chart03 from '../../data/charts/chart-03.json'
import chart04 from '../../data/charts/chart-04.json'
import chart05 from '../../data/charts/chart-05.json'
import chart06 from '../../data/charts/chart-06.json'
import chart07 from '../../data/charts/chart-07.json'
import chart08 from '../../data/charts/chart-08.json'
import chart09 from '../../data/charts/chart-09.json'
import chart10 from '../../data/charts/chart-10.json'
import chart11 from '../../data/charts/chart-11.json'
import chart12 from '../../data/charts/chart-12.json'
import chart13 from '../../data/charts/chart-13.json'
import chart14 from '../../data/charts/chart-14.json'
import chart15 from '../../data/charts/chart-15.json'
import chart16 from '../../data/charts/chart-16.json'
import chart17 from '../../data/charts/chart-17.json'
import chart18 from '../../data/charts/chart-18.json'
import chart19 from '../../data/charts/chart-19.json'
import chart20 from '../../data/charts/chart-20.json'

export const evidence = evidenceJson as EvidenceRow[]
export const codebook = (codebookJson as { codes: CodebookEntry[] }).codes
export const participants = participantsJson as Participant[]
export const themes = (themesJson as { themes: ThemeEntry[] }).themes
export const subthemes = (subthemesJson as { subthemes: SubThemeEntry[] }).subthemes
export const verificationModes = (verificationJson as { modes: VerificationMode[] }).modes
export const feedbackSignals = (feedbackJson as { signals: FeedbackSignal[] }).signals
export const painPoints = painPointsJson as PainPoint[]
export const opportunities = opportunitiesJson as Opportunity[]
export const contradictions = contradictionsJson as Record<string, unknown>[]
export const nonUse = nonUseJson as Record<string, unknown>[]
export const comparison = comparisonJson as Record<string, unknown>[]
export const insights = insightsJson as Record<string, unknown>[]
export const researchLimits = researchLimitsJson as Record<string, unknown>[]
export const round3Results = round3Json as Record<string, unknown>[]
export const round4Results = round4Json as Record<string, unknown>[]
export const headline = headlineJson as HeadlineBlock[]
export const altText = altTextJson as Record<string, string | null>

const chartModules = [
  chart01, chart02, chart03, chart04, chart05,
  chart06, chart07, chart08, chart09, chart10,
  chart11, chart12, chart13, chart14, chart15,
  chart16, chart17, chart18, chart19, chart20,
]

export const charts: ChartSpec[] = chartModules.map((c) => {
  const spec = c as ChartSpec
  spec.alt_text = altText[spec.id] ?? null
  return spec
})

export const P011_ID = 'P011'

export function isP011(pid: string): boolean {
  return pid === P011_ID
}

export const PARTICIPANT_IDS = participants.map((p) => p.id)
export const RBM_PARTICIPANTS = participants.filter((p) => !isP011(p.id)).map((p) => p.id)
