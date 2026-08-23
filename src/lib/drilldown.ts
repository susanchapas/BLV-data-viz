export function buildDrillUrl(params: {
  theme?: string
  code?: string | string[]
  participant?: string
  search?: string
  detectability?: string
  signalStatus?: string
}): string {
  const sp = new URLSearchParams()
  if (params.theme) sp.append('t', params.theme)
  if (params.code) {
    const codes = Array.isArray(params.code) ? params.code : [params.code]
    codes.forEach((c) => sp.append('c', c))
  }
  if (params.participant) sp.append('p', params.participant)
  if (params.search) sp.set('q', params.search)
  if (params.detectability) sp.append('det', params.detectability)
  if (params.signalStatus) sp.append('ss', params.signalStatus)
  const qs = sp.toString()
  return qs ? `/evidence?${qs}` : '/evidence'
}
