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
      className={`block card hover:border-navy motion-safe:transition-colors ${
        isEcho ? 'border-amethyst bg-surface-sunk' : ''
      }`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-heading text-lg text-navy-900">{p.id}</span>
        <span className="font-mono text-xs text-text-muted">{evidenceCount} rows</span>
      </div>
      <p className="text-[15px] text-text-muted mb-1">{p.Persona}</p>
      <p className="font-mono text-xs text-text-muted">{p.Device}</p>
      {isEcho && (
        <p className="font-mono text-xs tracking-[0.06em] text-action mt-2 px-3 py-1.5 bg-surface-sunk rounded-pill inline-block">
          EchoVision by AGIGA
        </p>
      )}
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
      <Link
        to="/participants"
        className="text-[15px] font-bold text-action hover:text-action-hover hover:underline mb-6 inline-flex items-center min-h-12 px-4 py-3 rounded-button border border-transparent hover:border-border"
      >
        ← All participants
      </Link>

      <div className="mb-6">
        <p className="section-label">05 — Participant profile</p>
        <h1 className="section-heading">{pid}</h1>
        <p className="body-lg">{p.Persona}</p>
        {isP011(pid) && (
          <p className="font-mono text-xs tracking-[0.06em] text-action mt-2 px-3 py-1.5 bg-surface-sunk border border-border rounded-pill inline-block">
            This participant uses EchoVision by AGIGA, not Ray-Ban Meta.
          </p>
        )}
      </div>

      <div className="card mb-8">
        <h2 className="font-mono text-xs tracking-[0.14em] uppercase text-navy-900 mb-4">Attributes</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {attrs.map(([key, val]) => (
            <div key={key} className="border-b border-border pb-2">
              <dt className="font-mono text-xs text-text-muted font-medium tracking-[0.06em] uppercase">{key}</dt>
              <dd className="text-[15px] text-text mt-0.5">{val != null ? String(val) : '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <h2 className="font-heading text-[22px] font-normal text-navy-900 mb-4">
        Evidence ({rows.length} rows)
      </h2>
      <div className="table-wrap overflow-y-auto" style={{ maxHeight: '60vh' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]" style={{ borderCollapse: 'collapse' }}>
            <thead className="sticky top-0 bg-surface-sunk z-10">
              <tr className="border-b-2 border-border-strong">
                <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Line</th>
                <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Code</th>
                <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Theme</th>
                <th className="text-left px-4 py-3 font-bold text-navy-900" scope="col">Quote</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: EvidenceRow, i: number) => (
                <tr key={i} className="border-b border-border hover:bg-surface-sunk">
                  <td className="px-4 py-3 font-mono text-xs">{r.Line}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.Code}</td>
                  <td className="px-4 py-3">{r.Theme}</td>
                  <td className="px-4 py-3">
                    <blockquote className="not-italic">
                      {r.Quote}
                      <cite className="text-xs text-text-muted ml-1 not-italic font-mono">{r.Who} {r.Line}</cite>
                    </blockquote>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      <div className="mb-6">
        <p className="section-label">05 — Participant profiles</p>
        <h1 id="participants-heading" className="section-heading">
          Who took part in the study.
        </h1>
        <p className="body-lg">
          {visibleParticipants.length} participants. Click a card to see their full profile and evidence.
        </p>
        <DeviceNote total={visibleParticipants.length} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleParticipants.map((p) => (
          <ProfileCard key={p.id} p={p} evidenceCount={countByPid[p.id] ?? 0} />
        ))}
      </div>
    </section>
  )
}
