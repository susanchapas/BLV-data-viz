import { useFilters } from '@/lib/filters'

export function DeviceNote({ total, label = 'participants' }: { total: number; label?: string }) {
  const { filters } = useFilters()
  if (filters.includeP011) {
    return (
      <p className="text-sm text-text-muted mt-1">
        {total} {label} (16 Ray-Ban Meta + 1 EchoVision by AGIGA)
      </p>
    )
  }
  return (
    <p className="text-sm text-text-muted mt-1">
      {total} of 16 Ray-Ban Meta {label}. P011 (EchoVision) excluded.
    </p>
  )
}
