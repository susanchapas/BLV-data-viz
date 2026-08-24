import { useRef, useEffect, useCallback, useState } from 'react'
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
import {
  themes,
  codebook,
  painPoints,
  opportunities,
  verificationModes,
  feedbackSignals,
  participants,
} from '@/lib/data'
import type { EvidenceRow } from '@/lib/types'

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

const TYPE_LABELS: Record<NodeType, string> = {
  theme: 'Theme',
  code: 'Code',
  painPoint: 'Pain Point',
  opportunity: 'Opportunity',
  verification: 'Verification',
  feedback: 'Feedback',
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

const pMap = new Map(participants.map(p => [p.id, p]))

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-mono uppercase tracking-wider text-action mb-1.5">{title}</h3>
      {children}
    </div>
  )
}

function QuoteList({ rows }: { rows: EvidenceRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="text-sm border-l-2 border-border pl-3 py-1">
          <p className="text-text italic">&ldquo;{r.Quote}&rdquo;</p>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            {r.Who} &middot; {r.Code}
          </p>
        </div>
      ))}
    </div>
  )
}

function PidChips({ pids }: { pids: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {pids.map(pid => (
        <span
          key={pid}
          className="inline-flex items-center px-2 py-0.5 rounded-pill bg-surface-sunk border border-border text-xs font-mono text-navy-900"
          title={pMap.get(pid)?.Persona ?? undefined}
        >
          {pid}
        </span>
      ))}
    </div>
  )
}

function InfoPanel({
  node,
  links,
  nodes,
  onClose,
  onSelect,
}: {
  node: GraphNode
  links: GraphLink[]
  nodes: GraphNode[]
  onClose: () => void
  onSelect: (node: GraphNode) => void
}) {
  const key = node.id.slice(node.id.indexOf(':') + 1)
  const colors = TYPE_COLORS[node.type]

  const connectedIds = new Set<string>()
  for (const l of links) {
    const sId = typeof l.source === 'string' ? l.source : l.source.id
    const tId = typeof l.target === 'string' ? l.target : l.target.id
    if (sId === node.id) connectedIds.add(tId)
    if (tId === node.id) connectedIds.add(sId)
  }
  const connectedNodes = nodes.filter(n => connectedIds.has(n.id))

  let details: React.ReactNode = null

  switch (node.type) {
    case 'theme': {
      const theme = themes.find(t => t.Theme === key)
      const ev = evidenceByTheme.get(key) ?? []
      const pids = [...new Set(ev.map(e => e.Who))]
      details = (
        <>
          {theme?.['why it matters'] && (
            <PanelSection title="Why it matters">
              <p className="text-sm text-text-muted">{theme['why it matters']}</p>
            </PanelSection>
          )}
          {theme && (
            <PanelSection title="Overview">
              <div className="flex gap-4 text-sm text-text-muted">
                <span>{theme['Sub-themes']} sub-themes</span>
                <span>{theme.Total} coded quotes</span>
              </div>
            </PanelSection>
          )}
          {ev.length > 0 && (
            <PanelSection title={`Quotes (${ev.length})`}>
              <QuoteList rows={ev.slice(0, 4)} />
              {ev.length > 4 && <p className="text-xs text-text-muted mt-2">+{ev.length - 4} more</p>}
            </PanelSection>
          )}
          {pids.length > 0 && (
            <PanelSection title={`Participants (${pids.length})`}>
              <PidChips pids={pids} />
            </PanelSection>
          )}
        </>
      )
      break
    }
    case 'code': {
      const code = codebook.find(c => c.Code === key)
      const ev = evidenceByCode.get(key) ?? []
      const pids = [...new Set(ev.map(e => e.Who))]
      details = (
        <>
          {code?.Note && (
            <PanelSection title="Note">
              <p className="text-sm text-text-muted">{code.Note}</p>
            </PanelSection>
          )}
          {code && (
            <PanelSection title="Codebook hierarchy">
              <p className="text-sm font-mono text-text-muted leading-relaxed">
                {code['Theme name']}<br />
                &ensp;&rarr; {code['Sub-theme']}<br />
                &ensp;&ensp;&rarr; {code.Code} {code.Label}
              </p>
            </PanelSection>
          )}
          {ev.length > 0 && (
            <PanelSection title={`Quotes (${ev.length})`}>
              <QuoteList rows={ev.slice(0, 4)} />
              {ev.length > 4 && <p className="text-xs text-text-muted mt-2">+{ev.length - 4} more</p>}
            </PanelSection>
          )}
          {pids.length > 0 && (
            <PanelSection title={`Participants (${pids.length})`}>
              <PidChips pids={pids} />
            </PanelSection>
          )}
        </>
      )
      break
    }
    case 'painPoint': {
      const pp = painPoints.find(p => p.Tag === key)
      if (pp) {
        const ppCodes = pp['Evidence codes']?.split(/,\s*/).filter(Boolean) ?? []
        const ev = ppCodes.flatMap(c => evidenceByCode.get(c) ?? [])
        details = (
          <>
            <PanelSection title="What happens">
              <p className="text-sm text-text-muted">{pp['What happens']}</p>
            </PanelSection>
            <PanelSection title="Context">
              <dl className="text-sm text-text-muted space-y-1">
                <div><dt className="inline font-medium text-text">Theme:</dt> {pp.Theme}</div>
                <div><dt className="inline font-medium text-text">Sub-theme:</dt> {pp['Sub-theme']}</div>
                <div><dt className="inline font-medium text-text">Who:</dt> {pp.Who}</div>
              </dl>
            </PanelSection>
            {ppCodes.length > 0 && (
              <PanelSection title="Evidence codes">
                <div className="flex flex-wrap gap-1.5">
                  {ppCodes.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-pill bg-navy/5 border border-navy/20 text-xs font-mono text-navy-900">{c}</span>
                  ))}
                </div>
              </PanelSection>
            )}
            {ev.length > 0 && (
              <PanelSection title={`Quotes (${ev.length})`}>
                <QuoteList rows={ev.slice(0, 3)} />
                {ev.length > 3 && <p className="text-xs text-text-muted mt-2">+{ev.length - 3} more</p>}
              </PanelSection>
            )}
          </>
        )
      }
      break
    }
    case 'opportunity': {
      const opp = opportunities.find(o => o.Tag === key)
      if (opp) {
        details = (
          <>
            <PanelSection title="Detail">
              <p className="text-sm text-text-muted">{opp.Detail}</p>
            </PanelSection>
            <PanelSection title="Context">
              <dl className="text-sm text-text-muted space-y-1">
                <div><dt className="inline font-medium text-text">Theme:</dt> {opp.Theme}</div>
                <div><dt className="inline font-medium text-text">Fixes:</dt> {opp.Fixes}</div>
              </dl>
            </PanelSection>
          </>
        )
      }
      break
    }
    case 'verification': {
      const va = verificationModes.find(v => v.Tag === key)
      if (va) {
        details = (
          <>
            <PanelSection title="Classification">
              <dl className="text-sm text-text-muted space-y-1">
                <div><dt className="inline font-medium text-text">Failure class:</dt> {va['Failure class']}</div>
                <div><dt className="inline font-medium text-text">Task surface:</dt> {va['Task surface']}</div>
              </dl>
            </PanelSection>
            <PanelSection title="Detection">
              <dl className="text-sm text-text-muted space-y-1">
                <div><dt className="inline font-medium text-text">Without sight:</dt> {va['Detectable without sight']}</div>
                <div><dt className="inline font-medium text-text">Channel:</dt> {va['Detection channel available']}</div>
                <div><dt className="inline font-medium text-text">Cost:</dt> {va['Cost to detect']}</div>
              </dl>
            </PanelSection>
            <PanelSection title="Consequence">
              <p className="text-sm text-text-muted">{va['Consequence if it goes undetected']}</p>
            </PanelSection>
          </>
        )
      }
      break
    }
    case 'feedback': {
      const fb = feedbackSignals.find(f => f.Tag === key)
      if (fb) {
        details = (
          <>
            <PanelSection title="Signal status">
              <p className="text-sm text-text-muted">{fb['Signal status']}</p>
            </PanelSection>
            <PanelSection title="Where it applies">
              <p className="text-sm text-text-muted">{fb['Where it applies']}</p>
            </PanelSection>
            <PanelSection title="What the device does">
              <p className="text-sm text-text-muted">{fb['What the device does']}</p>
            </PanelSection>
            <PanelSection title="What the absence costs">
              <p className="text-sm text-text-muted">{fb['What the absence costs']}</p>
            </PanelSection>
          </>
        )
      }
      break
    }
  }

  return (
    <div className="w-[360px] shrink-0 border-l border-border bg-surface-raised overflow-y-auto">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span
            className="inline-block px-2.5 py-0.5 text-xs font-mono rounded-pill text-white"
            style={{ background: colors.fill }}
          >
            {TYPE_LABELS[node.type]}
          </span>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-lg leading-none p-1 -mr-1 -mt-1"
            aria-label="Close panel"
          >
            &times;
          </button>
        </div>
        <h2 className="text-lg font-semibold text-navy leading-snug mb-5">{node.label}</h2>
        {details}
        {connectedNodes.length > 0 && (
          <PanelSection title={`Connections (${connectedNodes.length})`}>
            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              {connectedNodes.map(cn => (
                <button
                  key={cn.id}
                  onClick={() => onSelect(cn)}
                  className="flex items-center gap-2 text-sm w-full text-left hover:bg-surface-sunk rounded px-1.5 py-1 -mx-1.5 transition-colors"
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: TYPE_COLORS[cn.type].fill }}
                  />
                  <span className="text-text-muted truncate">{cn.label}</span>
                </button>
              ))}
            </div>
          </PanelSection>
        )}
      </div>
    </div>
  )
}

export function NeuralMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null)
  const graphRef = useRef<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })
  const animRef = useRef<number>(0)
  const hoveredRef = useRef<GraphNode | null>(null)
  const draggingRef = useRef<GraphNode | null>(null)
  const selectedRef = useRef<GraphNode | null>(null)
  const transformRef = useRef({ x: 0, y: 0, k: 1 })
  const dimensionsRef = useRef({ width: 1200, height: 800 })
  const canvasSizedRef = useRef({ width: 0, height: 0 })
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const { shouldAnimate } = useMotion()
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

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
    const selected = selectedRef.current
    const hovered = hoveredRef.current

    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.k, transform.k)

    const { nodes, links } = graphRef.current
    const selectedId = selected?.id

    const connectedIds = new Set<string>()
    if (selectedId) {
      connectedIds.add(selectedId)
      for (const l of links) {
        const sId = typeof l.source === 'string' ? l.source : l.source.id
        const tId = typeof l.target === 'string' ? l.target : l.target.id
        if (sId === selectedId || tId === selectedId) {
          connectedIds.add(sId)
          connectedIds.add(tId)
        }
      }
    }

    for (const l of links) {
      const s = l.source as GraphNode
      const t = l.target as GraphNode
      if (s.x == null || t.x == null) continue

      const isHighlighted = selectedId && connectedIds.has(s.id) && connectedIds.has(t.id)
      ctx.beginPath()
      ctx.moveTo(s.x, s.y!)
      ctx.lineTo(t.x, t.y!)
      ctx.strokeStyle = isHighlighted
        ? 'rgba(168, 70, 160, 0.6)'
        : selectedId
          ? 'rgba(16, 47, 93, 0.03)'
          : 'rgba(16, 47, 93, 0.08)'
      ctx.lineWidth = isHighlighted ? 1.5 : 0.5
      ctx.stroke()
    }

    for (const node of nodes) {
      if (node.x == null) continue
      const colors = TYPE_COLORS[node.type]
      const isConnected = !selectedId || connectedIds.has(node.id)
      const isSelected = node.id === selectedId

      ctx.beginPath()
      ctx.arc(node.x, node.y!, node.radius, 0, Math.PI * 2)
      ctx.fillStyle = isConnected ? colors.fill : 'rgba(16, 47, 93, 0.08)'
      ctx.fill()

      if (isSelected) {
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

      const showLabel =
        isSelected ||
        (node.type === 'theme' && transform.k > 0.5 && isConnected) ||
        (selectedId && isConnected && transform.k > 0.7)
      if (showLabel) {
        ctx.font = `${isSelected ? 'bold ' : ''}${Math.round(11 / transform.k)}px 'Atkinson Hyperlegible', sans-serif`
        ctx.fillStyle = isConnected ? '#102F5D' : 'rgba(16, 47, 93, 0.3)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const labelText = node.label.length > 30 ? node.label.slice(0, 28) + '…' : node.label
        ctx.fillText(labelText, node.x, node.y! + node.radius + 4)
      }
    }

    ctx.restore()

    if (hovered && hovered.id !== selectedId) {
      ctx.font = "bold 13px 'Atkinson Hyperlegible', sans-serif"
      ctx.fillStyle = '#102F5D'
      ctx.textAlign = 'left'
      ctx.fillText(hovered.label, 16, height - 40)
      ctx.font = "11px 'IBM Plex Mono', monospace"
      ctx.fillStyle = '#3D4C63'
      ctx.fillText(`${hovered.type}`, 16, height - 22)
    }
  }, [])

  useEffect(() => {
    const { nodes, links } = buildGraph()
    graphRef.current = { nodes, links }
    const { width, height } = dimensionsRef.current

    const sim = forceSimulation<GraphNode>(nodes)
      .force('link', forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => 140 + (d.source as GraphNode).radius + (d.target as GraphNode).radius)
        .strength(d => d.strength * 0.6))
      .force('charge', forceManyBody<GraphNode>()
        .strength(d => -180 - d.radius * 6)
        .distanceMax(800))
      .force('center', forceCenter(width / 2, height / 2).strength(0.03))
      .force('collide', forceCollide<GraphNode>(d => d.radius + 8).iterations(3))
      .force('x', forceX<GraphNode>(width / 2).strength(0.015))
      .force('y', forceY<GraphNode>(height / 2).strength(0.015))
      .alphaDecay(0.018)
      .velocityDecay(0.25)

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

  const handleSelect = useCallback((node: GraphNode | null) => {
    selectedRef.current = node
    setSelectedNode(node)
    cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(draw)
  }, [draw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedRef.current) handleSelect(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSelect])

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

  const zoom = useCallback((direction: 1 | -1) => {
    const { width, height } = dimensionsRef.current
    const cx = width / 2
    const cy = height / 2
    const prev = transformRef.current
    const factor = direction > 0 ? 1.3 : 1 / 1.3
    const newK = Math.max(0.2, Math.min(4, prev.k * factor))
    transformRef.current = {
      x: cx - (cx - prev.x) * (newK / prev.k),
      y: cy - (cy - prev.y) * (newK / prev.k),
      k: newK,
    }
    cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(draw)
  }, [draw])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    pointerStartRef.current = { x: sx, y: sy }
    lastPointerRef.current = { x: sx, y: sy }

    const node = findNode(sx, sy)
    if (node) {
      const { x, y } = screenToWorld(sx, sy)
      node.fx = x
      node.fy = y
      draggingRef.current = node
      simRef.current?.alphaTarget(0.8).restart()
    } else {
      isPanningRef.current = true
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
    }
    canvasRef.current?.setPointerCapture(e.pointerId)
  }, [findNode, screenToWorld])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    if (draggingRef.current) {
      const { x, y } = screenToWorld(sx, sy)
      draggingRef.current.fx = x
      draggingRef.current.fy = y
      const sim = simRef.current
      if (sim && sim.alpha() < 0.5) sim.alpha(0.5).restart()
      return
    }

    if (isPanningRef.current) {
      const dx = sx - lastPointerRef.current.x
      const dy = sy - lastPointerRef.current.y
      lastPointerRef.current = { x: sx, y: sy }
      transformRef.current = {
        ...transformRef.current,
        x: transformRef.current.x + dx,
        y: transformRef.current.y + dy,
      }
      cancelAnimationFrame(animRef.current)
      animRef.current = requestAnimationFrame(draw)
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

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const start = pointerStartRef.current
    const dist = start ? Math.hypot(sx - start.x, sy - start.y) : 999

    if (draggingRef.current) {
      const d = draggingRef.current
      d.fx = null
      d.fy = null
      if (dist < 5) {
        handleSelect(selectedRef.current === d ? null : d)
      }
      draggingRef.current = null
      const sim = simRef.current
      if (sim) {
        sim.alphaTarget(0).alpha(0.3).restart()
      }
    } else if (isPanningRef.current) {
      isPanningRef.current = false
      if (dist < 5) {
        handleSelect(null)
      }
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
    }

    pointerStartRef.current = null
    canvasRef.current?.releasePointerCapture(e.pointerId)
    cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(draw)
  }, [draw, handleSelect])

  return (
    <div className="flex w-full h-[calc(100vh-180px)] min-h-[600px]">
      <div ref={containerRef} className="relative flex-1 min-w-0">
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
          style={{ background: 'var(--color-surface-sunk)', cursor: 'grab', touchAction: 'none' }}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        />
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <span className="text-xs font-mono text-text-muted mr-1">Drag to pan</span>
          <button
            onClick={() => zoom(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-button bg-surface-raised border border-border text-navy font-mono text-lg leading-none hover:bg-surface-sunk transition-colors"
            aria-label="Zoom out"
          >
            &minus;
          </button>
          <button
            onClick={() => zoom(1)}
            className="w-8 h-8 flex items-center justify-center rounded-button bg-surface-raised border border-border text-navy font-mono text-lg leading-none hover:bg-surface-sunk transition-colors"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>
      {selectedNode && (
        <InfoPanel
          node={selectedNode}
          links={graphRef.current.links}
          nodes={graphRef.current.nodes}
          onClose={() => handleSelect(null)}
          onSelect={handleSelect}
        />
      )}
    </div>
  )
}
