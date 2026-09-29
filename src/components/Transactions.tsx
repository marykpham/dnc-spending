import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { load, type Meta, type Txn } from '../lib/data'
import { money } from '../lib/format'
import { useData } from '../lib/useData'
import { useMedia } from '../lib/useMedia'
import { Status } from './Status'

type SortKey = 'date' | 'amount' | 'payee' | 'category'
const COLS = '110px 130px minmax(180px, 1.2fr) 1fr minmax(160px, 1.5fr)'

function csvEscape(s: string) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function Transactions() {
  const meta = useData<Meta>('meta.json')
  const [year, setYear] = useState<string>()
  const [rows, setRows] = useState<Txn[]>()
  const [error, setError] = useState<string>()
  const [query, setQuery] = useState('')
  const [hideMemo, setHideMemo] = useState(true)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 })

  useEffect(() => {
    if (meta.data && !year) setYear(meta.data.years[0])
  }, [meta.data, year])

  useEffect(() => {
    if (!year) return
    let live = true
    setRows(undefined)
    load<Txn[]>(`transactions-${year}.json`).then(
      (d) => live && setRows(d),
      (e) => live && setError(String(e.message)),
    )
    return () => {
      live = false
    }
  }, [year])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLowerCase()
    const out = rows.filter(
      (r) => (!hideMemo || !r.memo) && (!q || `${r.payee} ${r.purpose} ${r.category}`.toLowerCase().includes(q)),
    )
    out.sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
    return out
  }, [rows, query, sort, hideMemo])

  const memoCount = useMemo(() => rows?.filter((r) => r.memo).length ?? 0, [rows])

  const narrow = useMedia('(max-width: 700px)')
  const scroller = useRef<HTMLDivElement>(null)
  const virt = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => (narrow ? 72 : 40),
    overscan: 12,
  })

  useEffect(() => virt.measure(), [narrow, virt])

  const total = useMemo(() => filtered.reduce((s, r) => (r.memo ? s : s + r.amount), 0), [filtered])

  function exportCsv() {
    const head = ['date', 'amount', 'payee', 'category', 'purpose', 'memo_item']
    const lines = filtered.map((r) =>
      [r.date, r.amount, r.payee, r.category, r.purpose, r.memo].map((v) => csvEscape(String(v))).join(','),
    )
    const url = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `dnc-disbursements-${year}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const header = (key: SortKey, label: string) => (
    <button
      className="th"
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : -1 }))}
    >
      {label} {sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}
    </button>
  )

  return (
    <section>
      <div className="toolbar">
        <h2>The ledger</h2>
        <div className="filters">
          <select value={year ?? ''} onChange={(e) => setYear(e.target.value)} aria-label="Year">
            {meta.data?.years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search payee, purpose, category…"
            aria-label="Search the ledger by payee, purpose or category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="sort-ctl">
            <select value={sort.key} onChange={(e) => setSort((s) => ({ ...s, key: e.target.value as SortKey }))} aria-label="Sort by">
              <option value="date">Sort: Date</option>
              <option value="amount">Sort: Amount</option>
              <option value="payee">Sort: Payee</option>
              <option value="category">Sort: Category</option>
            </select>
            <button onClick={() => setSort((s) => ({ ...s, dir: (-s.dir as 1 | -1) }))} aria-label="Reverse sort order">
              {sort.dir === 1 ? '↑' : '↓'}
            </button>
          </span>
          <button onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </button>
        </div>
      </div>
      <Status data={meta.data && rows} error={meta.error ?? error} />
      {rows && (
        <>
          <div className="ledger-meta">
            <p className="muted" aria-live="polite">
              {filtered.length.toLocaleString()} rows · {money(total)} total
              {!hideMemo && ' (memo rows not counted)'}
            </p>
            <label className="toggle">
              <input type="checkbox" checked={hideMemo} onChange={(e) => setHideMemo(e.target.checked)} />
              <span className="track" aria-hidden />
              Hide memo items{memoCount ? ` (${memoCount.toLocaleString()})` : ''}
            </label>
          </div>
          <p className="memo-note">
            <b>Memo items</b> are entries already counted elsewhere in the filing, listed for detail. They are never
            added to totals.
          </p>
          <div className="table">
            <div className="row head" style={{ gridTemplateColumns: COLS }}>
              {header('date', 'Date')}
              {header('amount', 'Amount')}
              {header('payee', 'Payee')}
              {header('category', 'Category')}
              <span>Purpose</span>
            </div>
            <div ref={scroller} className="body" tabIndex={0} role="region" aria-label="Disbursements list (scrollable)">
              <div role="list" style={{ height: virt.getTotalSize(), position: 'relative' }}>
                {virt.getVirtualItems().map((v) => {
                  const r = filtered[v.index]
                  return (
                    <div
                      key={r.id}
                      role="listitem"
                      aria-setsize={filtered.length}
                      aria-posinset={v.index + 1}
                      aria-label={`${r.date}, ${r.payee}, ${money(r.amount)}, ${r.category.replace(/_/g, ' ').toLowerCase()}, ${r.purpose}${r.memo ? ', memo item, not counted in totals' : ''}`}
                      className={`row${r.memo ? ' memo' : ''}`}
                      style={{
                        gridTemplateColumns: narrow ? undefined : COLS,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: v.size,
                        transform: `translateY(${v.start}px)`,
                      }}
                    >
                      <span>{r.date}</span>
                      <span className="num">{money(r.amount)}</span>
                      <span title={r.payee}>
                        {r.memo && <em className="memo-tag">Memo</em>}
                        {r.payee}
                      </span>
                      <span>{r.category.replace(/_/g, ' ').toLowerCase()}</span>
                      <span title={r.purpose}>{r.purpose}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
