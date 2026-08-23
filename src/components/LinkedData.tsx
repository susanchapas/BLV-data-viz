import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { participants, PARTICIPANT_IDS, isP011 } from '@/lib/data'
import { buildDrillUrl } from '@/lib/drilldown'
import type { EvidenceRow } from '@/lib/types'

const pMap = new Map(participants.map((p) => [p.id, p]))

export function ParticipantPills({
  pids,
  counts,
}: {
  pids: string[]
  counts?: Record<string, number>
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {pids.map((pid) => {
        const p = pMap.get(pid)
        return (
          <Link
            key={pid}
            to={`/participants/${pid}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-surface-sunk border border-border text-xs font-mono text-navy-900 hover:bg-cornflower/10 hover:border-cornflower transition-colors"
            title={p?.Persona ?? undefined}
          >
            {pid}
            {counts?.[pid] != null && (
              <span className="text-text-muted">({counts[pid]})</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

export function CodePills({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {codes.map((code) => (
        <Link
          key={code}
          to={buildDrillUrl({ code })}
          className="inline-flex items-center px-2.5 py-1 rounded-pill bg-navy/5 border border-navy/20 text-xs font-mono text-navy-900 hover:bg-navy/10 hover:border-navy/40 transition-colors"
        >
          {code}
        </Link>
      ))}
    </div>
  )
}

export function ThemeLink({
  id,
  name,
}: {
  id: string
  name?: string
}) {
  return (
    <Link
      to={`/themes?t=${id}`}
      className="text-action hover:underline"
    >
      {id}{name ? ` ${name}` : ''}
    </Link>
  )
}

export function EvidencePreview({
  rows,
  drillParams,
  max = 5,
}: {
  rows: EvidenceRow[]
  drillParams?: Parameters<typeof buildDrillUrl>[0]
  max?: number
}) {
  const shown = rows.slice(0, max)
  return (
    <div className="space-y-2">
      {shown.map((r, i) => (
        <div key={i} className="text-sm border-l-2 border-border pl-3 py-1">
          <p className="text-text">&ldquo;{r.Quote}&rdquo;</p>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            <Link
              to={`/participants/${r.Who}`}
              className="text-action hover:underline"
            >
              {r.Who}
            </Link>{' '}
            {r.Line}
            {' · '}
            <Link
              to={buildDrillUrl({ code: r.Code })}
              className="text-action hover:underline"
            >
              {r.Code}
            </Link>
          </p>
        </div>
      ))}
      {rows.length > max && drillParams && (
        <Link
          to={buildDrillUrl(drillParams)}
          className="inline-flex items-center gap-1 text-sm text-action hover:underline font-medium"
        >
          View all {rows.length} rows →
        </Link>
      )}
    </div>
  )
}

export function CountButton({
  count,
  expanded,
  onClick,
  label,
}: {
  count: number | string
  expanded: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      className={`font-mono underline decoration-dotted underline-offset-2 hover:text-action hover:decoration-solid transition-colors ${
        expanded ? 'text-action decoration-solid' : ''
      }`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-expanded={expanded}
      aria-label={label}
    >
      {count}
    </button>
  )
}

export function ExpandedPanel({
  open,
  colSpan,
  children,
}: {
  open: boolean
  colSpan: number
  children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <tr>
          <td colSpan={colSpan} className="p-0 border-b border-border">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-6 py-5 bg-surface-sunk/60">{children}</div>
            </motion.div>
          </td>
        </tr>
      )}
    </AnimatePresence>
  )
}

export function getActiveParticipants(
  item: Record<string, unknown>,
  includeP011: boolean,
): { pids: string[]; counts: Record<string, number> } {
  const pids: string[] = []
  const counts: Record<string, number> = {}
  for (const pid of PARTICIPANT_IDS) {
    if (!includeP011 && isP011(pid)) continue
    const val = item[pid]
    if (typeof val === 'number' && val > 0) {
      pids.push(pid)
      counts[pid] = val
    }
  }
  return { pids, counts }
}
