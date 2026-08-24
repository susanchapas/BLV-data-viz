import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function Logo() {
  return (
    <svg width="48" height="48" viewBox="0 0 40 40" aria-hidden="true" focusable="false" className="flex-none">
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="none" stroke="#102F5D" strokeWidth="3" />
      <rect x="9" y="17.5" width="22" height="5" rx="2.5" fill="#A846A0" />
      <circle cx="20" cy="20" r="2.5" fill="#FFFFFF" />
      <rect x="9" y="27" width="13" height="4" rx="2" fill="#24509F" />
      <rect x="9" y="9" width="17" height="4" rx="2" fill="#C7D3EA" />
    </svg>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <span className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] leading-none text-inherit">{value}</span>
      <span className="block font-mono text-[11px] tracking-[0.12em] uppercase opacity-70 mt-1">{label}</span>
    </div>
  )
}

interface DashboardStats {
  evidenceCount: number
  codebookCount: number
  themeCount: number
  verificationCount: number
  signalCount: number
  silentCount: number
  chartCount: number
  participantIds: string[]
}

function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  useEffect(() => {
    import('@/lib/data').then(({ evidence, participants, themes, verificationModes, feedbackSignals, charts, codebook }) => {
      setStats({
        evidenceCount: evidence.length,
        codebookCount: codebook.length,
        themeCount: themes.length,
        verificationCount: verificationModes.length,
        signalCount: feedbackSignals.length,
        silentCount: feedbackSignals.filter(s => s['Signal status'] === 'Silent').length,
        chartCount: charts.length,
        participantIds: participants.map(p => p.id),
      })
    })
  }, [])
  return stats
}

export function Dashboard() {
  const stats = useDashboardStats()

  return (
    <div className="min-h-screen bg-surface text-text font-sans">
      <header className="max-w-[1240px] mx-auto" style={{ padding: 'clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px) 0' }}>
        <div className="flex items-center gap-4 mb-2">
          <Logo />
          <div>
            <h1 className="font-heading text-[clamp(1.25rem,2.5vw,1.5rem)] leading-none tracking-[-0.01em] text-navy">
              BLV Accessibility Research Data
            </h1>
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-text-muted mt-1">
              Interactive Data Explorer
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto" style={{ padding: 'clamp(24px, 4vw, 40px) clamp(20px, 4vw, 48px) clamp(48px, 6vw, 80px)' }}>
        <div className="mb-8">
          <p className="section-label">Smart glasses study · 17 participants</p>
          <h2 className="section-heading">Explore the research data, your way.</h2>
          <p className="body-lg">
            Semi-structured interviews with blind and low-vision users of consumer AI smart glasses.
            Pick a lens below to start exploring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr"
          style={{ gridAutoRows: 'minmax(180px, auto)' }}>

          <Link
            to="/generator"
            className="group col-span-1 md:col-span-2 md:row-span-2 rounded-[var(--radius-card)] bg-navy text-white no-underline overflow-hidden relative flex flex-col justify-between"
            style={{ padding: 'clamp(1.5rem, 3vw, 2rem)' }}
          >
            <div className="relative z-10">
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-sand block mb-3">Data Explorer</span>
              <span className="font-heading text-[clamp(1.5rem,3.2vw,2.25rem)] leading-[1.1] tracking-[-0.02em] block max-w-[20ch]">
                Build custom charts from any variable
              </span>
              <p className="text-[15px] text-baby-blue mt-3 max-w-[42ch] leading-relaxed">
                Cross-tabulate by demographics, compare cohorts, and switch chart types on the fly.
              </p>
            </div>
            <div className="relative z-10 flex gap-6 mt-6">
              <Stat value={stats?.codebookCount ?? '–'} label="codes" />
              <Stat value={stats?.themeCount ?? '–'} label="themes" />
              <Stat value="7" label="demographics" />
            </div>
            <div className="absolute right-0 bottom-0 opacity-[0.08]" aria-hidden="true">
              <svg width="280" height="280" viewBox="0 0 280 280">
                <rect x="20" y="180" width="40" height="80" rx="4" fill="currentColor" />
                <rect x="80" y="120" width="40" height="140" rx="4" fill="currentColor" />
                <rect x="140" y="60" width="40" height="200" rx="4" fill="currentColor" />
                <rect x="200" y="140" width="40" height="120" rx="4" fill="currentColor" />
              </svg>
            </div>
            <span className="absolute bottom-6 right-6 font-mono text-[13px] text-baby-blue opacity-0 group-hover:opacity-100 transition-opacity z-10">
              Explore &rarr;
            </span>
          </Link>

          <Link
            to="/evidence"
            className="group rounded-[var(--radius-card)] bg-surface-raised border border-border no-underline flex flex-col justify-between hover:border-navy transition-colors"
            style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem)' }}
          >
            <div>
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-action block mb-3">Evidence</span>
              <span className="font-heading text-[clamp(1.1rem,2vw,1.375rem)] leading-[1.15] text-navy-900 block">
                Browse coded quotes
              </span>
              <p className="text-[14px] text-text-muted mt-2 leading-relaxed">
                Filter, sort and search all coded evidence from 17 interviews.
              </p>
            </div>
            <Stat value={stats?.evidenceCount ?? '–'} label="coded rows" />
          </Link>

          <Link
            to="/themes"
            className="group rounded-[var(--radius-card)] bg-surface-raised border border-border no-underline flex flex-col justify-between hover:border-navy transition-colors"
            style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem)' }}
          >
            <div>
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-action block mb-3">Themes</span>
              <span className="font-heading text-[clamp(1.1rem,2vw,1.375rem)] leading-[1.15] text-navy-900 block">
                Thematic analysis
              </span>
              <p className="text-[14px] text-text-muted mt-2 leading-relaxed">
                Major themes and sub-themes that emerged from the data.
              </p>
            </div>
            <Stat value={stats?.themeCount ?? '–'} label="themes" />
          </Link>

          <Link
            to="/signals"
            className="group rounded-[var(--radius-card)] border border-border no-underline flex flex-col justify-between hover:border-navy transition-colors"
            style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem)', background: 'var(--color-surface-sunk)' }}
          >
            <div>
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-action block mb-3">Signals</span>
              <span className="font-heading text-[clamp(1.1rem,2vw,1.375rem)] leading-[1.15] text-navy-900 block">
                Feedback gaps
              </span>
              <p className="text-[14px] text-text-muted mt-2 leading-relaxed">
                Signals users need but the device fails to provide.
              </p>
            </div>
            <div className="flex gap-4">
              <Stat value={stats?.signalCount ?? '–'} label="signals" />
              <Stat value={stats?.silentCount ?? '–'} label="silent" />
            </div>
          </Link>

          <Link
            to="/verification"
            className="group rounded-[var(--radius-card)] border border-border no-underline flex flex-col justify-between hover:border-navy transition-colors"
            style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem)', background: 'var(--color-surface-sunk)' }}
          >
            <div>
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-action block mb-3">Verification</span>
              <span className="font-heading text-[clamp(1.1rem,2vw,1.375rem)] leading-[1.15] text-navy-900 block">
                Trust asymmetry
              </span>
              <p className="text-[14px] text-text-muted mt-2 leading-relaxed">
                How verification failures compound when users can't see.
              </p>
            </div>
            <Stat value={stats?.verificationCount ?? '–'} label="failure modes" />
          </Link>

          <Link
            to="/charts"
            className="group rounded-[var(--radius-card)] bg-surface-raised border border-border no-underline flex flex-col justify-between hover:border-navy transition-colors"
            style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem)' }}
          >
            <div>
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-action block mb-3">Charts</span>
              <span className="font-heading text-[clamp(1.1rem,2vw,1.375rem)] leading-[1.15] text-navy-900 block">
                Pre-built gallery
              </span>
              <p className="text-[14px] text-text-muted mt-2 leading-relaxed">
                Publication-ready charts with alt text and data tables.
              </p>
            </div>
            <Stat value={stats?.chartCount ?? '–'} label="charts" />
          </Link>

          <Link
            to="/participants"
            className="group col-span-1 md:col-span-2 lg:col-span-3 rounded-[var(--radius-card)] bg-surface-raised border border-border no-underline flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-navy transition-colors"
            style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem)' }}
          >
            <div>
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-action block mb-3">Participants</span>
              <span className="font-heading text-[clamp(1.1rem,2vw,1.375rem)] leading-[1.15] text-navy-900 block">
                {stats ? `${stats.participantIds.length} individual profiles` : 'Individual profiles'}
              </span>
              <p className="text-[14px] text-text-muted mt-2 leading-relaxed max-w-[50ch]">
                Demographics, devices, personas, and per-participant evidence links.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:max-w-[280px]">
              {stats?.participantIds.map(id => (
                <span key={id} className="font-mono text-[11px] px-2 py-1 rounded-pill bg-surface-sunk border border-border text-text-muted">
                  {id}
                </span>
              ))}
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
