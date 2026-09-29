import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyTotal } from '../lib/data'
import { moneyCompact, quarterOf } from '../lib/format'
import { useData } from '../lib/useData'
import { axisTick, Tip } from './chart'
import { Reveal } from './Reveal'
import { Status } from './Status'

export function OverTime() {
  const { data, error } = useData<MonthlyTotal[]>('monthly.json')
  const [mode, setMode] = useState<'month' | 'quarter'>('month')

  const rows = useMemo(() => {
    if (!data) return []
    if (mode === 'month') return data.map((d) => ({ label: d.month, total: d.total }))
    const q = new Map<string, number>()
    for (const d of data) q.set(quarterOf(d.month), (q.get(quarterOf(d.month)) ?? 0) + d.total)
    return [...q].map(([label, total]) => ({ label, total }))
  }, [data, mode])
  const max = Math.max(0, ...rows.map((r) => r.total))
  const peak = rows.find((r) => r.total === max)

  return (
    <section>
      <div className="toolbar">
        <div>
          <h2>Disbursements over time</h2>
          {peak && (
            <p className="lede">
              Peak: <b>{moneyCompact(peak.total)}</b> in {peak.label}.
            </p>
          )}
        </div>
        <div className="seg">
          {(['month', 'quarter'] as const).map((m) => (
            <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
              {m === 'month' ? 'Monthly' : 'Quarterly'}
            </button>
          ))}
        </div>
      </div>
      <Status data={data} error={error} />
      {data && (
        <Reveal wipe>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={rows} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
            <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: 'var(--rule)' }} tickLine={false} minTickGap={28} />
            <YAxis tickFormatter={moneyCompact} tick={axisTick} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={Tip} cursor={{ fill: 'var(--wash)' }} />
            <Bar dataKey="total" name="Disbursed" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.label} fill={r.total === max ? 'var(--accent)' : 'var(--bar)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </Reveal>
      )}
    </section>
  )
}
