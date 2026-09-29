import { useRef, type CSSProperties } from 'react'

const MINT = [53, 240, 176]
const BLUE = [109, 139, 255]
const CORAL = [255, 90, 71]
/** mint → blue → coral, interpolated per letter */
const ramp = (t: number) => {
  const [a, b, u] = t < 0.5 ? [MINT, BLUE, t * 2] : [BLUE, CORAL, (t - 0.5) * 2]
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`
}

/** Headline whose letters rise in, ripple on a loop, and swell near the cursor (variable-font axes). */
export function KineticTitle({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLHeadingElement>(null)
  let idx = 0

  const each = (fn: (el: HTMLElement) => void) => ref.current?.querySelectorAll<HTMLElement>('.ch').forEach(fn)
  const onMove = (e: React.PointerEvent) =>
    each((c) => {
      const r = c.getBoundingClientRect()
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))
      c.style.setProperty('--p', String(Math.max(0, 1 - d / 260) ** 1.6))
    })
  const onLeave = () => each((c) => c.style.setProperty('--p', '0'))

  return (
    <h1 ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} aria-label={lines.join(' ')}>
      {lines.map((line, li) => {
        const start = idx
        const len = line.replace(/\s/g, '').length
        return (
        <span className={`line l${li}`} key={li} aria-hidden>
          {line.split(' ').map((w, wi) => (
            <span className="word" key={wi}>
              {[...w].map((ch) => {
                const i = idx++
                return (
                  <span key={i} className="ch" style={{ '--i': i, '--c': ramp((i - start) / Math.max(1, len - 1)) } as CSSProperties}>
                    {ch}
                  </span>
                )
              })}
            </span>
          ))}
        </span>
        )
      })}
    </h1>
  )
}
