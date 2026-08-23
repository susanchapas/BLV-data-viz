export interface EvidenceRow {
  '#': number | string
  Who: string
  Theme: string
  'Theme name': string
  'Sub-theme': string
  'Label as coded': string
  Code: string
  Quote: string
  Line: string
}

export interface CodebookEntry {
  Code: string
  Label: string
  Note: string
  Theme: string
  'Theme name': string
  'Sub-theme': string
  Status: string
  Total: number
  [pid: string]: string | number | null
}

export interface Participant {
  id: string
  Persona: string
  Device: string
  'Interview date': string
  [attr: string]: string | number | null | undefined
}

export interface ThemeEntry {
  Theme: string
  Name: string
  examples: string
  'why it matters': string
  'Sub-themes': number
  Total: number
  [pid: string]: string | number | null
}

export interface SubThemeEntry {
  Theme: string
  'Theme name': string
  'Sub-theme': string
  Note: string
  'Coded quotes': number
  [pid: string]: string | number | null
}

export interface VerificationMode {
  Tag: string
  'Failure mode': string
  'Failure class': string
  'Task surface': string
  'Evidence codes': string
  'Detectable without sight': string
  'Detection channel available': string
  'Cost to detect': string
  'Basis (cited evidence row)': string
  'Consequence if it goes undetected': string
  'Rows (n=17)': number
  'Participants (n=17)': number
  mode_codes: string[]
  [pid: string]: string | number | string[] | null
}

export interface FeedbackSignal {
  Tag: string
  'Signal the user needs': string
  'Signal status': string
  'Where it applies': string
  'What the device does': string
  'What the absence costs': string
  'Basis (cited evidence row)': string
  'Rows (n=17)': number
  'Participants (n=17)': number
  codes: string[]
  [pid: string]: string | number | string[] | null
}

export interface PainPoint {
  Tag: string
  'Pain point': string
  'What happens': string
  Theme: string
  'Sub-theme': string
  Who: string
  'Evidence codes': string
}

export interface Opportunity {
  Tag: string
  'Do this': string
  Detail: string
  Theme: string
  Fixes: string
}

export interface ChartSpec {
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

export interface HeadlineBlock {
  block: string
  block_note: string | null
  block_detail: string | null
  superseded: boolean
  items: { label: string; result: string; detail: string }[]
}

export interface ChartProps<T> {
  data: T[]
  mode: 'web' | 'print'
  width: number
  height: number
  animate?: boolean
  title: string
  caption: string
  source: string
  altText: string
  deviceNote?: string
}

export interface FilterState {
  participants: string[]
  themes: string[]
  codes: string[]
  detectability: string[]
  failureClass: string[]
  signalStatus: string[]
  visionStatus: string[]
  search: string
  includeP011: boolean
}

export const EMPTY_FILTERS: FilterState = {
  participants: [],
  themes: [],
  codes: [],
  detectability: [],
  failureClass: [],
  signalStatus: [],
  visionStatus: [],
  search: '',
  includeP011: false,
}
