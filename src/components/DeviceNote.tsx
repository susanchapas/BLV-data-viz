import { useFilters } from '@/lib/filters'

export function DeviceNote({ total, label = 'participants' }: { total: number; label?: string }) {
  const { filters } = useFilters()
  const text = filters.includeP011
    ? `${total} ${label} (16 Ray-Ban Meta + 1 EchoVision by AGIGA)`
    : `${total} of 16 Ray-Ban Meta ${label}. P011 (EchoVision) excluded.`

  return (
    <p className="font-mono text-xs tracking-[0.06em] text-text-muted mt-1 px-4 py-2 bg-surface-sunk border border-border rounded-pill inline-block">
      {text}
    </p>
  )
}
