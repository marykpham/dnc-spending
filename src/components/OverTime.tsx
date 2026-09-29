import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyTotal } from '../lib/data'
import { money, moneyCompact, quarterOf } from '../lib/format'
import { useData } from '../lib/useData'
import { axisTick, Tip } from './chart'
import { Reveal } from './Reveal'
import { SrTable } from './SrTable'
import { Status } from './Status'

export function OverTime() {
  const { data, error } = useData<MonthlyTotal[]>('monthly.json')
  const [mode, setMode] = useState<'month' | 'quarter'>('month')

  const rows = useMemo(() => {
    if (!data) return []
    if (mode === 'month') return data.map((d) => ({ label: d.month, total: d.total, months: 1 }))
    const q = new Map<string, { total: number; months: number }>()
    for (const d of data) {
      const k = quarterOf(d.month)
      const cur = q.get(k) ?? { total: 0, months: 0 }
      q.set(k, { total: cur.total + d.total, months: cur.months + 1 })
    }
    return [...q].map(([label, v]) => ({ label, ...v }))
  }, [data, mode])
  const max = Math.max(0, ...rows.map((r) => r.total))
  const peak = rows.find((r) => r.total === max)

  return (
    <section>
      <div className="toolbar">
        <div>
          <h2>Spending over time</h2>
          {peak && (
            <p className="lede">
              Peak: <b>{moneyCompact(peak.total)}</b> in {peak.label}.
            </p>
          )}
        </div>
        <div className="seg">
          {(['month', 'quarter'] as const).map((m) => (
            <button key={m} className={mode === m ? 'on' : ''} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'month' ? 'Monthly' : 'Quarterly'}
            </button>
          ))}
        </div>
      </div>
      <Status data={data} error={error} />
      {data && (
        <Reveal wipe>
        <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={rows} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
            <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: 'var(--rule)' }} tickLine={false} minTickGap={28} />
            <YAxis tickFormatter={moneyCompact} tick={axisTick} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={Tip} cursor={{ fill: 'var(--wash)' }} />
            <Bar dataKey="total" name="Disbursed" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.label} fill={r.total === max ? 'var(--accent)' : 'var(--bar)'} fillOpacity={r.months < 3 && mode === 'quarter' ? 0.45 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
        </Reveal>
      )}
      {data && <SrTable caption={`Money spent per ${mode}`} head={[mode === 'month' ? 'Month' : 'Quarter', 'Spent']} rows={rows.map((r) => [r.label + (mode === 'quarter' && r.months < 3 ? ` (${r.months} of 3 months)` : ''), money(r.total)])} />}
    </section>
  )
}
