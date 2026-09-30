import { useMemo, useState } from 'react'
import type { Filing, Meta } from '../lib/data'
import { money } from '../lib/format'
import { seenAtLoad } from '../lib/seenFiling'
import { useData } from '../lib/useData'
import { Status } from './Status'

const day = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const isReport = (f: Filing) => f.form === 'F3X'

export function Filings() {
  const { data, error } = useData<Filing[]>('filings.json')
  const meta = useData<Meta>('meta.json')
  const [all, setAll] = useState(false)
  const seen = seenAtLoad // "new" means new since the last visit; App records this visit
  const rows = useMemo(() => data?.filter((f) => all || isReport(f)), [data, all])
  const adminCount = useMemo(() => data?.filter((f) => !isReport(f)).length ?? 0, [data])

  // Running totals from the current version of each monthly report in the detail window.
  const totals = useMemo(() => {
    const from = meta.data?.detailFrom ?? ''
    const cur = data?.filter((f) => isReport(f) && !f.superseded && f.end && f.end >= from) ?? []
    if (!cur.length) return undefined
    const latest = cur.reduce((a, b) => ((a.end ?? '') >= (b.end ?? '') ? a : b))
    return {
      raised: cur.reduce((s, f) => s + (f.receipts ?? 0), 0),
      spent: cur.reduce((s, f) => s + (f.disbursements ?? 0), 0),
      cash: latest.cashOnHand ?? 0,
      latest,
      count: cur.length,
      since: cur.reduce((m, f) => ((f.start ?? f.end ?? m) < m ? (f.start ?? f.end ?? m) : m), '9999'),
    }
  }, [data, meta.data])

  return (
    <section>
      <div className="toolbar">
        <div>
          <h2>Latest filings</h2>
          <p className="lede">
            Each report the DNC has filed with the FEC, newest first, with a link to the official document. The DNC files
            monthly, so expect about one new report a month.
          </p>
        </div>
      </div>
      <Status data={data} error={error ?? meta.error} />
      {data && rows && (
        <>
          {totals && (
            <dl className="runtot">
              <div>
                <dt>Raised since {day(totals.since)}</dt>
                <dd className="in">{money(totals.raised)}</dd>
              </div>
              <div>
                <dt>Spent since {day(totals.since)}</dt>
                <dd className="out">{money(totals.spent)}</dd>
              </div>
              <div>
                <dt>Cash on hand</dt>
                <dd>{money(totals.cash)}</dd>
              </div>
              <div>
                <dt>Last report</dt>
                <dd>{totals.latest.end ? day(totals.latest.end) : '—'}</dd>
                <small>filed {day(totals.latest.received)}</small>
              </div>
            </dl>
          )}
          {totals && (
            <p className="memo-note">
              Totals add up the current version of {totals.count} monthly reports since {day(totals.since)}. Where a
              report was amended, the amendment is counted and the original is not.
            </p>
          )}
          <div className="ledger-meta">
            <p className="muted">{rows.length} filings</p>
            {adminCount > 0 && (
              <label className="toggle">
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
                <span className="track" aria-hidden />
                Include administrative filings ({adminCount})
              </label>
            )}
          </div>
          <ol className="filings" aria-label="Filings, newest first">
            {rows.map((f) => {
              const fresh = seen !== undefined && f.file > seen
              const replacedBy =
                f.superseded && f.end
                  ? data.find((g) => g.amendment && g.form === f.form && g.end === f.end && g.file > f.file)
                  : undefined
              return (
                <li key={f.file} className={f.superseded ? 'old' : ''}>
                  <time dateTime={f.received}>{day(f.received)}</time>
                  <div className="ftitle">
                    <b>{f.title}</b>
                    {fresh && <em className="tag new">New</em>}
                    {f.amendment && <em className="tag amend">Amended</em>}
                    {f.superseded && <em className="tag old">Replaced</em>}
                    <small>
                      {isReport(f) ? 'Monthly report' : `Form ${f.form}`}
                      {f.start && f.end && <> · covers {day(f.start)} – {day(f.end)}</>}
                      {replacedBy && <> · replaced by filing #{replacedBy.file}</>}
                    </small>
                  </div>
                  <div className="fnums">
                    {f.receipts != null && (
                      <span>
                        <i>Raised</i> <b className="in">{money(f.receipts)}</b>
                      </span>
                    )}
                    {f.disbursements != null && (
                      <span>
                        <i>Spent</i> <b className="out">{money(f.disbursements)}</b>
                      </span>
                    )}
                  </div>
                  <div className="flinks">
                    {f.pdf && (
                      <a href={f.pdf} target="_blank" rel="noreferrer">
                        PDF<span className="sr-only"> of {f.title} (opens in a new tab)</span>
                      </a>
                    )}
                    {f.html && (
                      <a href={f.html} target="_blank" rel="noreferrer">
                        FEC page<span className="sr-only"> for {f.title} (opens in a new tab)</span>
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </section>
  )
}
