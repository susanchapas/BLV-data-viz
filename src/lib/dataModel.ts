import { evidence } from './data'
import type { EvidenceRow } from './types'

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const arr = map.get(key)
  if (arr) arr.push(value)
  else map.set(key, [value])
}

export const evidenceByTheme = new Map<string, EvidenceRow[]>()
export const evidenceByCode = new Map<string, EvidenceRow[]>()

for (const row of evidence) {
  pushTo(evidenceByTheme, row.Theme, row)
  pushTo(evidenceByCode, row.Code, row)
}
