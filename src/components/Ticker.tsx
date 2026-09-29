import { useEffect, useState } from 'react'
import { load, type Meta, type Txn } from '../lib/data'
import { money, titleCase } from '../lib/format'

/** Scrolling tape of the most recent real disbursements. */
export function Ticker() {
  const [items, setItems] = useState<Txn[]>([])
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const meta = await load<Meta>('meta.json')
        const rows = await load<Txn[]>(`transactions-${meta.years[0]}.json`)
        if (live) setItems(rows.filter((t) => !t.memo && t.amount >= 1000).slice(0, 40))
      } catch {
        /* the tape is decorative; ignore failures */
      }
    })()
    return () => {
      live = false
    }
  }, [])

  if (!items.length) return <div className="ticker" aria-hidden />
  return (
    <div className="ticker" role="marquee" aria-label="Recent disbursements">
      <div className="ticker-track">
        {[0, 1].map((k) =>
          items.map((t) => (
            <span className="tk" key={`${k}-${t.id}`} aria-hidden={k === 1}>
              <b>{money(t.amount)}</b>
              <i>→</i>
              {titleCase(t.payee)}
              <em>{(t.purpose || t.category).toLowerCase()}</em>
            </span>
          )),
        )}
      </div>
    </div>
  )
}
