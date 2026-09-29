import { useEffect, useRef } from 'react'
import type { Payee, Report } from '../lib/data'
import { moneyCompact, titleCase } from '../lib/format'
import { useData } from '../lib/useData'

interface Pt { x: number; y: number }
type Path = [Pt, Pt, Pt, Pt]
interface Particle { path: Path; t: number; v: number; r: number; dest: number; kind: 'in' | 'out' }
interface Bin { name: string; total: number; share: number; y: number; glow: number; label: string }

const MINT = '53,240,176'
const CORAL = '255,90,71'
const BLUE = '109,139,255'

const bez = (p: Path, t: number): Pt => {
  const u = 1 - t
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t
  return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y }
}

/**
 * Canvas motion piece: raised dollars stream in from the left, pass through the hub, and fan out
 * into rivers to the biggest payees. River width and particle share come from the real data.
 * The pointer scatters particles; the loop pauses off-screen and honors reduced motion.
 */
export function FlowHero({ paused = false }: { paused?: boolean }) {
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const wrap = useRef<HTMLDivElement>(null)
  const guides = useRef<HTMLCanvasElement>(null)
  const fg = useRef<HTMLCanvasElement>(null)
  const reports = useData<Report[]>('reports.json')
  const payees = useData<Payee[]>('payees.json')

  useEffect(() => {
    const rp = reports.data
    const py = payees.data
    if (!rp?.length || !py?.length) return
    const el = wrap.current!
    const gc = guides.current!
    const fc = fg.current!
    const g = gc.getContext('2d')!
    const ctx = fc.getContext('2d')!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    const recent = rp.slice(-12)
    const avgIn = recent.reduce((s, r) => s + r.receipts, 0) / recent.length
    const avgOut = recent.reduce((s, r) => s + r.disbursements, 0) / recent.length
    const top = py.slice(0, 7)
    const rest = py.slice(7).reduce((s, p) => s + p.total, 0)
    const all = [...top.map((p) => ({ name: titleCase(p.name), total: p.total })), { name: 'Everyone else', total: rest }]
    const sum = all.reduce((s, b) => s + b.total, 0)
    const bins: Bin[] = all.map((b) => ({ ...b, share: b.total / sum, y: 0, glow: 0, label: b.name }))
    const peak = Math.max(avgIn, avgOut)
    const rateIn = 80 * (avgIn / peak)
    const rateOut = 80 * (avgOut / peak)

    let W = 0, H = 0, binX = 0, labelW = 0
    let nameFont = '500 13px "Instrument Sans", system-ui, sans-serif'
    let subFont = '400 11px "JetBrains Mono", monospace'
    let hub = { x: 0, y: 0, r: 0 }
    let inPaths: Path[] = []
    let outPaths: Path[] = []
    const parts: Particle[] = []
    let accIn = 0, accOut = 0
    let mouse: Pt | null = null

    const pick = () => {
      let r = Math.random()
      for (let i = 0; i < bins.length; i++) {
        r -= bins[i].share
        if (r <= 0) return i
      }
      return bins.length - 1
    }
    const spawn = (kind: 'in' | 'out') => {
      if (parts.length > 900) return
      const dest = kind === 'out' ? pick() : 0
      const path = kind === 'in' ? inPaths[Math.floor(Math.random() * inPaths.length)] : outPaths[dest]
      parts.push({ path, t: 0, v: 0.22 + Math.random() * 0.22, r: 0.9 + Math.random() * 1.5, dest, kind })
    }
    const step = (dt: number) => {
      accIn += rateIn * dt
      accOut += rateOut * dt
      while (accIn >= 1) { accIn--; spawn('in') }
      while (accOut >= 1) { accOut--; spawn('out') }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.t += p.v * dt
        if (p.t >= 1) {
          if (p.kind === 'out') bins[p.dest].glow = Math.min(1, bins[p.dest].glow + 0.1)
          parts.splice(i, 1)
        }
      }
      for (const b of bins) b.glow = Math.max(0, b.glow - dt * 0.7)
    }

    const layout = () => {
      const rect = el.getBoundingClientRect()
      W = rect.width
      H = rect.height
      const dpr = Math.min(devicePixelRatio || 1, 2)
      for (const c of [gc, fc]) {
        c.width = W * dpr
        c.height = H * dpr
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const small = W < 640
      labelW = small ? Math.min(190, W * 0.5) : Math.min(260, W * 0.3)
      nameFont = `500 ${small ? 12 : 13}px "Instrument Sans", system-ui, sans-serif`
      subFont = `400 ${small ? 10 : 11}px "JetBrains Mono", monospace`
      binX = W - labelW
      hub = { x: W * (small ? 0.24 : 0.4), y: H / 2, r: small ? 27 : 50 }
      inPaths = [0.2, 0.5, 0.8].map((f, i) => [
        { x: -10, y: H * f },
        { x: hub.x * 0.5, y: H * f },
        { x: hub.x * 0.6, y: hub.y + (i - 1) * hub.r * 0.6 },
        { x: hub.x - hub.r, y: hub.y + (i - 1) * hub.r * 0.5 },
      ])
      const y0 = H * 0.11
      const y1 = H * 0.89
      bins.forEach((b, i) => {
        b.y = y0 + ((y1 - y0) * i) / (bins.length - 1)
      })
      const mid = hub.x + hub.r + (binX - hub.x - hub.r) * 0.5
      outPaths = bins.map((b) => [
        { x: hub.x + hub.r, y: hub.y },
        { x: mid, y: hub.y },
        { x: mid, y: b.y },
        { x: binX, y: b.y },
      ])
      // static underlay: the river beds, width proportional to share
      g.clearRect(0, 0, W, H)
      const bed = (p: Path, w: number, rgb: string, a: number) => {
        g.beginPath()
        g.moveTo(p[0].x, p[0].y)
        g.bezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y)
        g.strokeStyle = `rgba(${rgb},${a})`
        g.lineWidth = w
        g.lineCap = 'round'
        g.stroke()
      }
      inPaths.forEach((p) => bed(p, 6, MINT, 0.07))
      outPaths.forEach((p, i) => bed(p, 1 + bins[i].share * 22, CORAL, 0.09))
      ctx.font = nameFont
      bins.forEach((b) => {
        let s = b.name
        while (s.length > 3 && ctx.measureText(s).width > labelW - 34) s = s.slice(0, -1)
        b.label = s === b.name ? s : s.trimEnd() + '…'
      })
      parts.length = 0
    }

    const drawHub = (time: number) => {
      const { x, y, r } = hub
      const pulse = 1 + Math.sin(time * 2.2) * 0.035
      const gr = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2.6)
      gr.addColorStop(0, `rgba(${BLUE},0.38)`)
      gr.addColorStop(1, `rgba(${BLUE},0)`)
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(x, y, r * 2.6, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#080b13'
      ctx.beginPath()
      ctx.arc(x, y, r * pulse, 0, 7)
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = `rgba(${BLUE},0.95)`
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.setLineDash([2, 7])
      ctx.lineDashOffset = -time * 14
      ctx.strokeStyle = 'rgba(236,239,246,0.35)'
      ctx.beginPath()
      ctx.arc(x, y, r + 12, 0, 7)
      ctx.stroke()
      ctx.setLineDash([12, 10])
      ctx.lineDashOffset = time * 20
      ctx.strokeStyle = `rgba(${BLUE},0.5)`
      ctx.beginPath()
      ctx.arc(x, y, r + 24, 0, 7)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#eceff6'
      ctx.font = `700 ${r * 0.42}px "Bricolage Grotesque", system-ui, sans-serif`
      ctx.fillText('DNC', x, y - r * 0.08)
      ctx.fillStyle = 'rgba(236,239,246,0.5)'
      ctx.font = `500 ${Math.max(8, r * 0.17)}px "JetBrains Mono", monospace`
      ctx.fillText('FEC · C00010603', x, y + r * 0.34)
    }

    const drawBins = () => {
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      for (const b of bins) {
        const h = 10 + b.share * 70
        ctx.shadowColor = `rgba(${CORAL},0.9)`
        ctx.shadowBlur = 6 + b.glow * 26
        ctx.fillStyle = `rgba(${CORAL},${0.6 + b.glow * 0.4})`
        ctx.fillRect(binX - 2, b.y - h / 2, 4, h)
        ctx.shadowBlur = 0
        ctx.fillStyle = `rgba(236,239,246,${0.82 + b.glow * 0.18})`
        ctx.font = nameFont
        ctx.fillText(b.label, binX + 16, b.y - 8)
        ctx.fillStyle = 'rgba(135,145,167,1)'
        ctx.font = subFont
        ctx.fillText(`${moneyCompact(b.total)} · ${(b.share * 100).toFixed(0)}%`, binX + 16, b.y + 9)
      }
      ctx.font = '500 10px "JetBrains Mono", monospace'
      ctx.fillStyle = `rgba(${MINT},0.9)`
      ctx.fillText(`RAISED  ${moneyCompact(avgIn)} / MO`, 18, 22)
      ctx.fillStyle = `rgba(${CORAL},0.9)`
      ctx.fillText(`SPENT  ${moneyCompact(avgOut)} / MO`, binX + 16, 22)
    }

    const t0 = performance.now()
    const render = (now: number) => {
      const time = (now - t0) / 1000
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.17)'
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      for (const p of parts) {
        const pos = bez(p.path, p.t)
        if (mouse) {
          const dx = pos.x - mouse.x
          const dy = pos.y - mouse.y
          const d = Math.hypot(dx, dy)
          if (d < 120 && d > 0.01) {
            const k = (1 - d / 120) ** 2 * 38
            pos.x += (dx / d) * k
            pos.y += (dy / d) * k
          }
        }
        const a = Math.min(1, p.t * 7, (1 - p.t) * 7)
        const rgb = p.kind === 'in' ? MINT : CORAL
        ctx.fillStyle = `rgba(${rgb},${0.13 * a})`
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, p.r * 3.4, 0, 7)
        ctx.fill()
        ctx.fillStyle = `rgba(${rgb},${0.95 * a})`
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, p.r, 0, 7)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      drawHub(time)
      drawBins()
    }

    let raf = 0
    let last = performance.now()
    let visible = true
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible || pausedRef.current) return
      step(dt)
      render(now)
    }
    const still = () => {
      for (let i = 0; i < 260; i++) step(1 / 60)
      render(performance.now())
    }

    layout()
    if (reduced) still()
    else raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => {
      layout()
      if (reduced) still()
      else for (let i = 0; i < 120; i++) step(1 / 60)
    })
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const leave = () => (mouse = null)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [reports.data, payees.data])

  return (
    <div className="flow" ref={wrap} role="img" aria-label="Animated diagram: money raised flows into the DNC and out to its largest payees. The same figures are listed in the Top payees tab.">
      <canvas ref={guides} />
      <canvas ref={fg} />
    </div>
  )
}
