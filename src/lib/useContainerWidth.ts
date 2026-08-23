import { useState, useEffect, useRef, useCallback } from 'react'

export function useContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null!)
  const [width, setWidth] = useState(0)

  const update = useCallback(() => {
    if (ref.current) setWidth(ref.current.clientWidth)
  }, [])

  useEffect(() => {
    update()
    if (!ref.current) return
    const ro = new ResizeObserver(update)
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [update])

  return [ref, width]
}
