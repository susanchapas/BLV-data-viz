import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react'

interface MotionContextValue {
  reduceMotion: boolean
  setReduceMotion: (v: boolean) => void
  shouldAnimate: boolean
}

const MotionContext = createContext<MotionContextValue>({
  reduceMotion: false,
  setReduceMotion: () => {},
  shouldAnimate: true,
})

export function MotionProvider({ children }: { children: ReactNode }) {
  const [osPrefers, setOsPrefers] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )
  const [userOverride, setUserOverride] = useState<boolean | null>(null)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setOsPrefers(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const value = useMemo(() => {
    const reduceMotion = userOverride ?? osPrefers
    return {
      reduceMotion,
      setReduceMotion: (v: boolean) => setUserOverride(v),
      shouldAnimate: !reduceMotion,
    }
  }, [osPrefers, userOverride])

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export function useMotion() {
  return useContext(MotionContext)
}
