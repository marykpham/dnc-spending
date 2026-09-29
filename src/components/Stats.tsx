import type { Report } from '../lib/data'
import { moneyCompact } from '../lib/format'
import { useData } from '../lib/useData'
import { Odometer } from './Odometer'

function Stat({ label, value, sub, tone, delay }: { label: string; value: string; sub: string; tone: string; delay: number }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd className={tone}>
        <Odometer value={value} delay={delay} />
      </dd>
      <small>{sub}</small>
    </div>
  )
}

export function Stats() {
  const { data } = useData<Report[]>('reports.json')
  const latest = data?.at(-1)
  if (!data || !latest) return <div className="stats-skel" />

  const year = latest.end.slice(0, 4)
  const ytd = data.filter((r) => r.end.startsWith(year))
  const raised = ytd.reduce((s, r) => s + r.receipts, 0)
  const spent = ytd.reduce((s, r) => s + r.disbursements, 0)
  const net = latest.receipts - latest.disbursements
  const sign = (n: number) => (n >= 0 ? '+' : '−')

  return (
    <dl className="stats">
      <Stat label={`Spent in ${year}`} value={moneyCompact(spent)} sub={`from ${ytd.length} monthly reports`} tone="out" delay={0} />
      <Stat label={`Raised in ${year}`} value={moneyCompact(raised)} sub={`${sign(raised - spent)}${moneyCompact(Math.abs(raised - spent))} vs. spent`} tone="in" delay={120} />
      <Stat label="Cash on hand" value={moneyCompact(latest.cashOnHand)} sub={`in the bank on ${latest.end}`} tone="" delay={240} />
      <Stat
        label="Net, latest month"
        value={`${sign(net)}${moneyCompact(Math.abs(net))}`}
        sub={`${moneyCompact(latest.receipts)} in − ${moneyCompact(latest.disbursements)} out`}
        tone={net >= 0 ? 'in' : 'out'}
        delay={360}
      />
    </dl>
  )
}
