import { Link, NavLink, useSearchParams } from 'react-router-dom'
import { useMotion } from '@/lib/motion'

const links = [
  { to: '/generator', label: 'Generator' },
  { to: '/evidence', label: 'Evidence' },
  { to: '/verification', label: 'Verification' },
  { to: '/signals', label: 'Signals' },
  { to: '/themes', label: 'Themes' },
  { to: '/participants', label: 'Participants' },
  { to: '/charts', label: 'Charts' },
  { to: '/neural-map', label: 'Neural Map' },
]

function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false" className="flex-none">
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="none" stroke="#102F5D" strokeWidth="3" />
      <rect x="9" y="17.5" width="22" height="5" rx="2.5" fill="#A846A0" />
      <circle cx="20" cy="20" r="2.5" fill="#FFFFFF" />
      <rect x="9" y="27" width="13" height="4" rx="2" fill="#24509F" />
      <rect x="9" y="9" width="17" height="4" rx="2" fill="#C7D3EA" />
    </svg>
  )
}

export function Nav() {
  const { reduceMotion, setReduceMotion } = useMotion()
  const [searchParams] = useSearchParams()
  const qs = searchParams.toString()

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-navy focus:text-white focus:px-5 focus:py-3 focus:rounded-button focus:font-bold focus:text-base">
        Skip to main content
      </a>
      <header className="border-b border-border-strong bg-surface-raised">
        <div className="max-w-[1240px] mx-auto" style={{ padding: '0 clamp(20px, 4vw, 48px)' }}>
          <div className="flex items-center justify-between" style={{ padding: 'clamp(16px, 3vw, 24px) 0' }}>
            <Link to="/" className="flex items-center gap-4 no-underline">
              <Logo />
              <div className="flex flex-col gap-0.5">
                <span className="font-heading text-[21px] leading-none tracking-[-0.01em] text-navy">
                  BLV Accessibility Research Data
                </span>
                <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-text-muted">
                  Interactive Data Explorer
                </span>
              </div>
            </Link>
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              className="group flex items-center gap-2 font-mono text-xs tracking-[0.06em] text-text-muted hover:text-text px-4 py-2 min-h-12 rounded-button border border-transparent hover:border-border hover:bg-surface-sunk"
              aria-pressed={!reduceMotion}
              aria-label={`Motion ${reduceMotion ? 'off' : 'on'}`}
            >
              <span>Motion</span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors duration-150 ${
                  reduceMotion
                    ? 'bg-surface-sunk border-border-strong'
                    : 'bg-navy border-navy'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-150 mt-[1px] ${
                    reduceMotion ? 'translate-x-[2px]' : 'translate-x-[14px]'
                  }`}
                />
              </span>
            </button>
          </div>
          <nav aria-label="Main navigation" className="flex gap-1.5 overflow-x-auto pb-3">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={{ pathname: to, search: qs ? `?${qs}` : '' }}
                end={to === '/generator'}
                className={({ isActive }) =>
                  `px-4 py-3 text-[15px] rounded-button min-h-12 flex items-center border transition-colors ${
                    isActive
                      ? 'bg-navy text-white font-bold border-navy'
                      : 'text-text-muted hover:bg-surface-sunk border-transparent hover:border-border'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
    </>
  )
}
