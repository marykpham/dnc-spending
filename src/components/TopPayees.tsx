import type { CategoryTotal, Payee } from '../lib/data'
import type { CSSProperties } from 'react'
import { moneyCompact, plural, titleCase } from '../lib/format'
import { useData } from '../lib/useData'
import { Reveal } from './Reveal'
import { Status } from './Status'

function Ranked({ rows, note }: { rows: { name: string; total: number; sub?: string }[]; note?: string }) {
  const max = rows[0]?.total || 1
  const sum = rows.reduce((s, r) => s + r.total, 0)
  return (
    <ol className="ranked">
      {rows.map((r, i) => (
        <li key={r.name} style={{ '--d': i * 55 } as CSSProperties}>
          <span className="rk">{String(i + 1).padStart(2, '0')}</span>
          <span className="nm" title={r.name}>
            <b>{r.name}</b>
            {r.sub && <small>{r.sub}</small>}
          </span>
          <span className="amt">{moneyCompact(r.total)}</span>
          <span className="bar">
            <i style={{ '--w': r.total / max } as CSSProperties} className={i === 0 ? 'lead' : ''} />
          </span>
          <span className="pct">{((r.total / sum) * 100).toFixed(0)}%</span>
        </li>
      ))}
      {note && <li className="note">{note}</li>}
    </ol>
  )
}

export function TopPayees() {
  const payees = useData<Payee[]>('payees.json')
  const cats = useData<CategoryTotal[]>('categories.json')

  return (
    <section className="two-col">
      <div>
        <h2>Who gets paid</h2>
        <p className="lede">The fifteen largest recipients, by total disbursed.</p>
        <Status data={payees.data} error={payees.error} />
        {payees.data && (
          <Reveal>
          <Ranked
            rows={payees.data.slice(0, 15).map((p) => ({
              name: titleCase(p.name),
              total: p.total,
              sub: plural(p.count, 'payment'),
            }))}
          />
          </Reveal>
        )}
      </div>
      <div>
        <h2>What it’s for</h2>
        <p className="lede">FEC purpose categories. Share is of the categories shown.</p>
        <Status data={cats.data} error={cats.error} />
        {cats.data && (
          <Reveal>
          <Ranked
            rows={cats.data.slice(0, 15).map((c) => ({
              name: titleCase(c.category.replace(/_/g, ' ')),
              total: c.total,
            }))}
          />
          </Reveal>
        )}
      </div>
    </section>
  )
}
