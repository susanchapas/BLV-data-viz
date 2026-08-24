import { useRef, useEffect, useCallback } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import { useMotion } from '@/lib/motion'
import {
  evidenceByTheme,
  evidenceByCode,
} from '@/lib/dataModel'
import { themes, codebook, painPoints, opportunities, verificationModes, feedbackSignals } from '@/lib/data'

type NodeType = 'theme' | 'code' | 'painPoint' | 'opportunity' | 'verification' | 'feedback'

interface GraphNode extends SimulationNodeDatum {
  id: string
  label: string
  type: NodeType
  radius: number
  weight: number
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  strength: number
}

const TYPE_COLORS: Record<NodeType, { fill: string; stroke: string }> = {
  theme:        { fill: '#102F5D', stroke: '#6F9CEB' },
  code:         { fill: '#24509F', stroke: '#98B9F2' },
  painPoint:    { fill: '#A846A0', stroke: '#D88DD3' },
  opportunity:  { fill: '#4E521C', stroke: '#CACF85' },
  verification: { fill: '#75276F', stroke: '#C777C1' },
  feedback:     { fill: '#6F9CEB', stroke: '#FFFFFF' },
}

function buildGraph() {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const nodeMap = new Map<string, GraphNode>()

  function addNode(id: string, label: string, type: NodeType, weight: number) {
    if (nodeMap.has(id)) return
    const radiusMap: Record<NodeType, number> = {
      theme: 18,
      code: 6,
      painPoint: 9,
      opportunity: 9,
      verification: 11,
      feedback: 11,
    }
    const node: GraphNode = { id, label, type, radius: radiusMap[type], weight }
    nodes.push(node)
    nodeMap.set(id, node)
  }

  for (const t of themes) {
    const ev = evidenceByTheme.get(t.Theme) ?? []
    addNode(`theme:${t.Theme}`, t.Name, 'theme', ev.length)
  }

  for (const c of codebook) {
    const ev = evidenceByCode.get(c.Code) ?? []
    addNode(`code:${c.Code}`, c.Label, 'code', ev.length)
    links.push({ source: `code:${c.Code}`, target: `theme:${c.Theme}`, strength: 0.3 })
  }

  for (const pp of painPoints) {
    addNode(`pp:${pp.Tag}`, pp['Pain point'], 'painPoint', 1)
    const ppThemes = pp.Theme?.split(/,\s*/) ?? []
    for (const t of ppThemes) {
      if (nodeMap.has(`theme:${t}`) || themes.some(th => th.Theme === t)) {
        links.push({ source: `pp:${pp.Tag}`, target: `theme:${t}`, strength: 0.2 })
      }
    }
    const ppCodes = pp['Evidence codes']?.split(/,\s*/) ?? []
    for (const c of ppCodes.slice(0, 3)) {
      if (nodeMap.has(`code:${c}`)) {
        links.push({ source: `pp:${pp.Tag}`, target: `code:${c}`, strength: 0.15 })
      }
    }
  }

  for (const opp of opportunities) {
    addNode(`opp:${opp.Tag}`, opp['Do this'], 'opportunity', 1)
    const fixes = opp.Fixes?.split(/,\s*/) ?? []
    for (const ppTag of fixes.slice(0, 3)) {
      if (nodeMap.has(`pp:${ppTag}`)) {
        links.push({ source: `opp:${opp.Tag}`, target: `pp:${ppTag}`, strength: 0.2 })
      }
    }
  }

  for (const va of verificationModes) {
    addNode(`va:${va.Tag}`, va['Failure mode'], 'verification', va.mode_codes.length)
    for (const c of va.mode_codes.slice(0, 4)) {
      if (nodeMap.has(`code:${c}`)) {
        links.push({ source: `va:${va.Tag}`, target: `code:${c}`, strength: 0.25 })
      }
    }
  }

  for (const fb of feedbackSignals) {
    addNode(`fb:${fb.Tag}`, fb['Signal the user needs'], 'feedback', fb.codes.length)
    for (const c of fb.codes.slice(0, 4)) {
      if (nodeMap.has(`code:${c}`)) {
        links.push({ source: `fb:${fb.Tag}`, target: `code:${c}`, strength: 0.25 })
      }
    }
  }

  return { nodes, links }
}

export function NeuralMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null)
  const graphRef = useRef<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })
  const animRef = useRef<number>(0)
  const hoveredRef = useRef<GraphNode | null>(null)
  const draggingRef = useRef<GraphNode | null>(null)
  const transformRef = useRef({ x: 0, y: 0, k: 1 })
  const dimensionsRef = useRef({ width: 1200, height: 800 })
  const canvasSizedRef = useRef({ width: 0, height: 0 })
  const { shouldAnimate } = useMotion()

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = dimensionsRef.current
    const dpr = window.devicePixelRatio || 1

    if (canvasSizedRef.current.width !== width || canvasSizedRef.current.height !== height) {
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvasSizedRef.current = { width, height }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const transform = transformRef.current
    const hovered = hoveredRef.current

    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.k, transform.k)

    const { nodes, links } = graphRef.current
    const hoveredId = hovered?.id

    const connectedIds = new Set<string>()
    if (hoveredId) {
      connectedIds.add(hoveredId)
      for (const l of links) {
        const sId = typeof l.source === 'string' ? l.source : l.source.id
        const tId = typeof l.target === 'string' ? l.target : l.target.id
        if (sId === hoveredId || tId === hoveredId) {
          connectedIds.add(sId)
          connectedIds.add(tId)
        }
      }
    }

    for (const l of links) {
      const s = l.source as GraphNode
      const t = l.target as GraphNode
      if (s.x == null || t.x == null) continue

      const isHighlighted = hoveredId && (connectedIds.has(s.id) && connectedIds.has(t.id))
      ctx.beginPath()
      ctx.moveTo(s.x, s.y!)
      ctx.lineTo(t.x, t.y!)
      ctx.strokeStyle = isHighlighted
        ? 'rgba(168, 70, 160, 0.6)'
        : hoveredId
          ? 'rgba(16, 47, 93, 0.03)'
          : 'rgba(16, 47, 93, 0.08)'
      ctx.lineWidth = isHighlighted ? 1.5 : 0.5
      ctx.stroke()
    }

    for (const node of nodes) {
      if (node.x == null) continue
      const colors = TYPE_COLORS[node.type]
      const isConnected = !hoveredId || connectedIds.has(node.id)
      const isHovered = node.id === hoveredId

      ctx.beginPath()
      ctx.arc(node.x, node.y!, node.radius, 0, Math.PI * 2)
      ctx.fillStyle = isConnected ? colors.fill : 'rgba(16, 47, 93, 0.08)'
      ctx.fill()

      if (isHovered) {
        ctx.strokeStyle = colors.stroke
        ctx.lineWidth = 3
        ctx.stroke()

        ctx.shadowColor = colors.stroke
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(node.x, node.y!, node.radius + 2, 0, Math.PI * 2)
        ctx.strokeStyle = colors.stroke
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.shadowBlur = 0
      } else if (isConnected && node.type === 'theme') {
        ctx.strokeStyle = colors.stroke
        ctx.lineWidth = 2
        ctx.stroke()
      }

      if ((isHovered || (node.type === 'theme' && transform.k > 0.5)) && isConnected) {
        ctx.font = `${isHovered ? 'bold ' : ''}${Math.round(11 / transform.k)}px 'Atkinson Hyperlegible', sans-serif`
        ctx.fillStyle = isConnected ? '#102F5D' : 'rgba(16, 47, 93, 0.3)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const labelText = node.label.length > 30 ? node.label.slice(0, 28) + '…' : node.label
        ctx.fillText(labelText, node.x, node.y! + node.radius + 4)
      }
    }

    ctx.restore()

    if (hovered) {
      ctx.font = "bold 13px 'Atkinson Hyperlegible', sans-serif"
      ctx.fillStyle = '#102F5D'
      ctx.textAlign = 'left'
      ctx.fillText(hovered.label, 16, height - 40)
      ctx.font = "11px 'IBM Plex Mono', monospace"
      ctx.fillStyle = '#3D4C63'
      ctx.fillText(`${hovered.type} · ${connectedIds.size - 1} connections`, 16, height - 22)
    }
  }, [])

  useEffect(() => {
    const { nodes, links } = buildGraph()
    graphRef.current = { nodes, links }
    const { width, height } = dimensionsRef.current

    const sim = forceSimulation<GraphNode>(nodes)
      .force('link', forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => 60 + (d.source as GraphNode).radius + (d.target as GraphNode).radius)
        .strength(d => d.strength))
      .force('charge', forceManyBody<GraphNode>()
        .strength(d => -80 - d.radius * 4)
        .distanceMax(400))
      .force('center', forceCenter(width / 2, height / 2).strength(0.05))
      .force('collide', forceCollide<GraphNode>(d => d.radius + 3).iterations(2))
      .force('x', forceX<GraphNode>(width / 2).strength(0.02))
      .force('y', forceY<GraphNode>(height / 2).strength(0.02))
      .alphaDecay(0.028)
      .velocityDecay(0.4)

    if (!shouldAnimate) {
      sim.tick(300)
      sim.stop()
      draw()
    } else {
      sim.on('tick', () => {
        cancelAnimationFrame(animRef.current)
        animRef.current = requestAnimationFrame(draw)
      })
    }

    simRef.current = sim
    return () => { sim.stop() }
  }, [shouldAnimate, draw])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(entries => {
      const { width, height: h } = entries[0].contentRect
      const height = Math.max(h, 600)
      dimensionsRef.current = { width, height }

      const sim = simRef.current
      if (sim) {
        const cf = sim.force('center') as ReturnType<typeof forceCenter> | undefined
        cf?.x(width / 2).y(height / 2)
        const xf = sim.force('x') as ReturnType<typeof forceX> | undefined
        xf?.x(width / 2)
        const yf = sim.force('y') as ReturnType<typeof forceY> | undefined
        yf?.y(height / 2)
        if (sim.alpha() < 0.05) sim.alpha(0.1).restart()
      }
      draw()
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [draw])

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const t = transformRef.current
    return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k }
  }, [])

  const findNode = useCallback((sx: number, sy: number): GraphNode | null => {
    const { x, y } = screenToWorld(sx, sy)
    const { nodes } = graphRef.current
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      if (n.x == null) continue
      const dx = n.x - x
      const dy = n.y! - y
      if (dx * dx + dy * dy < (n.radius + 4) ** 2) return n
    }
    return null
  }, [screenToWorld])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    if (draggingRef.current) {
      const { x, y } = screenToWorld(sx, sy)
      draggingRef.current.fx = x
      draggingRef.current.fy = y
      return
    }

    const node = findNode(sx, sy)
    if (node !== hoveredRef.current) {
      hoveredRef.current = node
      cancelAnimationFrame(animRef.current)
      animRef.current = requestAnimationFrame(draw)
    }
    if (canvasRef.current) {
      canvasRef.current.style.cursor = node ? 'pointer' : 'grab'
    }
  }, [findNode, screenToWorld, draw])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const node = findNode(sx, sy)

    if (node) {
      const { x, y } = screenToWorld(sx, sy)
      node.fx = x
      node.fy = y
      draggingRef.current = node
      simRef.current?.alphaTarget(0.3).restart()
      canvasRef.current?.setPointerCapture(e.pointerId)
    }
  }, [findNode, screenToWorld])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = draggingRef.current
    if (d) {
      d.fx = null
      d.fy = null
      draggingRef.current = null
      simRef.current?.alphaTarget(0)
      canvasRef.current?.releasePointerCapture(e.pointerId)
    }
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    const prev = transformRef.current
    const factor = e.deltaY > 0 ? 0.92 : 1.08
    const newK = Math.max(0.2, Math.min(4, prev.k * factor))

    transformRef.current = {
      x: sx - (sx - prev.x) * (newK / prev.k),
      y: sy - (sy - prev.y) * (newK / prev.k),
      k: newK,
    }
    cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(draw)
  }, [draw])

  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-180px)] min-h-[600px] relative">
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-3">
        {(Object.entries(TYPE_COLORS) as [NodeType, { fill: string; stroke: string }][]).map(([type, { fill }]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: fill }} />
            {type}
          </span>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-card"
        style={{ background: 'var(--color-surface-sunk)' }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
      <div className="absolute bottom-4 right-4 text-xs font-mono text-text-muted">
        Scroll to zoom · Drag nodes to rearrange
      </div>
    </div>
  )
}
