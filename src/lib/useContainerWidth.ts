import { useState, useEffect, useCallback } from 'react'

export function useContainerWidth(): [(node: HTMLDivElement | null) => void, number] {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  const ref = useCallback((el: HTMLDivElement | null) => setNode(el), [])

  useEffect(() => {
    if (!node) return
    const update = () => setWidth(node.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [node])

  return [ref, width]
}
