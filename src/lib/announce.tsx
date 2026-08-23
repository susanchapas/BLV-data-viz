import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react'

interface AnnounceContextValue {
  announce: (message: string) => void
}

const AnnounceContext = createContext<AnnounceContextValue>({ announce: () => {} })

export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const announce = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setMessage(msg), 500)
  }, [])

  const value = useMemo(() => ({ announce }), [announce])

  return (
    <AnnounceContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  )
}

export function useAnnounce() {
  return useContext(AnnounceContext).announce
}
