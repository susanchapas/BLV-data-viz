import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFilters } from '@/lib/filters'
import { participants, evidence, isP011 } from '@/lib/data'
import { DeviceNote } from '@/components/DeviceNote'
import type { Participant, EvidenceRow } from '@/lib/types'

const SKIP_ATTRS = new Set(['id'])

function ProfileCard({ p, evidenceCount }: { p: Participant; evidenceCount: number }) {
  const isEcho = isP011(p.id)
  return (
    <Link
      to={`/participants/${p.id}`}
      className={`block p-4 border rounded hover:border-navy motion-safe:transition-colors ${
        isEcho ? 'border-amethyst bg-surface-sunk' : 'border-border'
      }`}
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-semibold text-text">{p.id}</span>
        <span className="text-sm text-text-muted">{evidenceCount} rows</span>
      </div>
      <p className="text-sm text-text-muted mb-1">{p.Persona}</p>
      <p className="text-xs text-text-muted">{p.Device}</p>
      {isEcho && <p className="text-xs text-action mt-1">EchoVision by AGIGA</p>}
    </Link>
  )
}

function ProfileDetail({ pid }: { pid: string }) {
  const { filterEvidence } = useFilters()
  const p = participants.find((x) => x.id === pid)
  const rows = useMemo(
    () => filterEvidence(evidence).filter((r) => r.Who === pid),
    [filterEvidence, pid],
  )

  if (!p) {
    return <p className="text-text-muted">Participant {pid} not found.</p>
  }

  const attrs = Object.entries(p).filter(([k]) => !SKIP_ATTRS.has(k))

  return (
    <div>
      <Link to="/participants" className="text-sm text-action hover:underline mb-4 inline-block min-h-[2.75rem] flex items-center">
        ← All participants
      </Link>
      <h1 className="text-xl font-semibold text-text mb-1">{pid}</h1>
      <p className="text-sm text-text-muted mb-4">{p.Persona}</p>
      {isP011(pid) && (
        <p className="text-sm text-action mb-4">
          This participant uses EchoVision by AGIGA, not Ray-Ban Meta.
        </p>
      )}

      <h2 className="text-lg font-semibold text-text mb-2">Attributes</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-8">
        {attrs.map(([key, val]) => (
          <div key={key} className="border-b border-border pb-1">
            <dt className="text-xs text-text-muted font-medium">{key}</dt>
            <dd className="text-sm text-text">{val != null ? String(val) : '—'}</dd>
          </div>
        ))}
      </dl>

      <h2 className="text-lg font-semibold text-text mb-2">
        Evidence ({rows.length} rows)
      </h2>
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto border border-border rounded">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-surface-raised">
            <tr>
              <th className="text-left px-2 py-2 border-b border-border-strong font-medium text-text-muted" scope="col">Line</th>
              <th className="text-left px-2 py-2 border-b border-border-strong font-medium text-text-muted" scope="col">Code</th>
              <th className="text-left px-2 py-2 border-b border-border-strong font-medium text-text-muted" scope="col">Theme</th>
              <th className="text-left px-2 py-2 border-b border-border-strong font-medium text-text-muted" scope="col">Quote</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: EvidenceRow, i: number) => (
              <tr key={i} className="hover:bg-surface-sunk">
                <td className="px-2 py-1.5 border-b border-border font-mono text-xs">{r.Line}</td>
                <td className="px-2 py-1.5 border-b border-border font-mono text-xs">{r.Code}</td>
                <td className="px-2 py-1.5 border-b border-border">{r.Theme}</td>
                <td className="px-2 py-1.5 border-b border-border">
                  <blockquote className="not-italic">
                    {r.Quote}
                    <cite className="text-xs text-text-muted ml-1 not-italic">{r.Who} {r.Line}</cite>
                  </blockquote>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ParticipantProfiles() {
  const { pid } = useParams<{ pid: string }>()
  const { filters, filterEvidence } = useFilters()

  const filteredEvidence = useMemo(() => filterEvidence(evidence), [filterEvidence])
  const countByPid = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of filteredEvidence) {
      counts[r.Who] = (counts[r.Who] ?? 0) + 1
    }
    return counts
  }, [filteredEvidence])

  if (pid) return <ProfileDetail pid={pid} />

  const visibleParticipants = filters.includeP011
    ? participants
    : participants.filter((p) => !isP011(p.id))

  return (
    <section aria-labelledby="participants-heading">
      <h1 id="participants-heading" className="text-xl font-semibold text-text mb-1">
        Participant profiles
      </h1>
      <DeviceNote total={visibleParticipants.length} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {visibleParticipants.map((p) => (
          <ProfileCard key={p.id} p={p} evidenceCount={countByPid[p.id] ?? 0} />
        ))}
      </div>
    </section>
  )
}
