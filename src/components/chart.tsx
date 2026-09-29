import type { TooltipContentProps } from 'recharts'
import { money } from '../lib/format'

export const axisTick = { fontFamily: 'var(--mono)', fontSize: 11, fill: 'var(--ink-2)' }

export function Tip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="tip">
      <div className="tip-label">{label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="tip-row">
          <i style={{ background: p.color ?? p.payload?.fill }} />
          <span>{p.name}</span>
          <b>{money(Number(p.value))}</b>
        </div>
      ))}
    </div>
  )
}
