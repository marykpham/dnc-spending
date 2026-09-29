import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useState } from 'react'
import type { Report } from '../lib/data'
import { moneyCompact } from '../lib/format'
import { useData } from '../lib/useData'
import { axisTick, Tip } from './chart'
import { Reveal } from './Reveal'
import { Status } from './Status'

export function ReceiptsVsSpending() {
  const { data, error } = useData<Report[]>('reports.json')
  const [range, setRange] = useState<12 | 36 | 0>(12)
  const rows = data?.slice(range ? -range : 0).map((r) => ({ ...r, label: r.end.slice(0, 7) }))

  return (
    <section>
      <div className="toolbar">
        <div>
          <h2>Money in, money out</h2>
          <p className="lede">Raised vs. spent per filing period, and the cash left over.</p>
        </div>
        <div className="seg">
          {([12, 36, 0] as const).map((r) => (
            <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>
              {r === 12 ? '12 mo' : r === 36 ? '3 yrs' : 'All'}
            </button>
          ))}
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--teal)' }} />Raised</span>
          <span><i style={{ background: 'var(--accent)' }} />Spent</span>
        </div>
      </div>
      <Status data={data} error={error} />
      {rows && (
        <>
          <Reveal wipe>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={rows} barGap={2} barCategoryGap="24%">
              <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
              <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: 'var(--rule)' }} tickLine={false} minTickGap={28} />
              <YAxis tickFormatter={moneyCompact} tick={axisTick} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={Tip} cursor={{ fill: 'var(--wash)' }} />
              <Bar dataKey="receipts" name="Raised" fill="var(--teal)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="disbursements" name="Spent" fill="var(--accent)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
          </Reveal>
          <h3>Cash on hand</h3>
          <Reveal wipe>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="coh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--ink)" stopOpacity={0.22} />
                  <stop offset="1" stopColor="var(--ink)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
              <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: 'var(--rule)' }} tickLine={false} minTickGap={28} />
              <YAxis tickFormatter={moneyCompact} tick={axisTick} axisLine={false} tickLine={false} width={56} domain={['auto', 'auto']} />
              <Tooltip content={Tip} />
              <Area type="monotone" dataKey="cashOnHand" name="Cash on hand" stroke="var(--ink)" strokeWidth={2} fill="url(#coh)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
          </Reveal>
        </>
      )}
    </section>
  )
}
