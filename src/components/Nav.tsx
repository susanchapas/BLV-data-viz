import { NavLink, useSearchParams } from 'react-router-dom'
import { useMotion } from '@/lib/motion'

const links = [
  { to: '/', label: 'Evidence' },
  { to: '/verification', label: 'Verification' },
  { to: '/signals', label: 'Signals' },
  { to: '/themes', label: 'Themes' },
  { to: '/participants', label: 'Participants' },
  { to: '/charts', label: 'Charts' },
]

export function Nav() {
  const { reduceMotion, setReduceMotion } = useMotion()
  const [searchParams] = useSearchParams()
  const qs = searchParams.toString()

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:text-white focus:px-3 focus:py-1 focus:rounded">
        Skip to main content
      </a>
      <header className="border-b border-grey-1 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 flex items-center justify-between">
          <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto py-2">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={{ pathname: to, search: qs ? `?${qs}` : '' }}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 text-sm rounded min-h-[2.75rem] flex items-center ${
                  isActive
                    ? 'bg-grey-5 text-white font-medium'
                    : 'text-grey-4 hover:bg-grey-0'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => setReduceMotion(!reduceMotion)}
          className="text-xs text-grey-3 hover:text-grey-5 px-2 py-1 min-h-[2.75rem]"
          aria-pressed={reduceMotion}
        >
          Motion {reduceMotion ? 'off' : 'on'}
        </button>
      </div>
    </header>
    </>
  )
}
