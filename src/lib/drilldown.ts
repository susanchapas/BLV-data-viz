export function buildDrillUrl(params: {
  theme?: string
  code?: string
  participant?: string
  search?: string
  detectability?: string
  signalStatus?: string
}): string {
  const sp = new URLSearchParams()
  if (params.theme) sp.append('t', params.theme)
  if (params.code) sp.append('c', params.code)
  if (params.participant) sp.append('p', params.participant)
  if (params.search) sp.set('q', params.search)
  if (params.detectability) sp.append('det', params.detectability)
  if (params.signalStatus) sp.append('ss', params.signalStatus)
  const qs = sp.toString()
  return qs ? `/evidence?${qs}` : '/evidence'
}
