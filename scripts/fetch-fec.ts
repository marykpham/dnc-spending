// Fetches DNC disbursements + filing reports from OpenFEC and writes static JSON to public/data.
// Env: FEC_API_KEY (default DEMO_KEY), CYCLES (comma list of two-year periods, default last 2),
//      MAX_PAGES (per cycle, for quick local runs).
import { mkdir, writeFile } from 'node:fs/promises'

const API = 'https://api.open.fec.gov/v1'
const COMMITTEE_ID = 'C00010603'
const KEY = process.env.FEC_API_KEY || 'DEMO_KEY'
const OUT = new URL('../public/data/', import.meta.url)
const MAX_PAGES = Number(process.env.MAX_PAGES || Infinity)

const thisCycle = Math.ceil(new Date().getFullYear() / 2) * 2
const list = (v: string | undefined, fallback: number[]) => (v ? v.split(',').map(Number) : fallback)
const TXN_CYCLES = list(process.env.TXN_CYCLES || process.env.CYCLES, [thisCycle])
const REPORT_CYCLES = list(process.env.REPORT_CYCLES, [thisCycle - 4, thisCycle - 2, thisCycle])

type Params = Record<string, string | number>

async function get(path: string, params: Params, attempt = 0): Promise<any> {
  const url = new URL(API + path)
  for (const [k, v] of Object.entries({ ...params, api_key: KEY })) url.searchParams.set(k, String(v))
  const res = await fetch(url)
  if ((res.status === 429 || res.status >= 500) && attempt < 12) {
    const wait = Math.min(2 ** attempt * 2000, 30000)
    console.warn(`  ${res.status} on ${path}; retrying in ${wait / 1000}s`)
    await new Promise((r) => setTimeout(r, wait))
    return get(path, params, attempt + 1)
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.pathname}`)
  return res.json()
}

export interface Txn {
  id: string
  date: string
  amount: number
  payee: string
  payeeKey: string
  purpose: string
  category: string
  memo: boolean
}

const SUFFIX = /\b(L\.?L\.?C\.?|INC\.?|CORP\.?|CORPORATION|CO\.?|LTD\.?|L\.?L\.?P\.?|P\.?C\.?)\b/g
const normalize = (name: string) =>
  name.toUpperCase().replace(SUFFIX, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

async function fetchDisbursements(cycle: number): Promise<Txn[]> {
  const rows: Txn[] = []
  let cursor: Params = {}
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await get('/schedules/schedule_b/', {
      committee_id: COMMITTEE_ID,
      two_year_transaction_period: cycle,
      per_page: 100,
      sort: '-disbursement_date',
      sort_hide_null: 'false',
      ...cursor,
    })
    for (const r of data.results) {
      if (!r.disbursement_date || r.disbursement_amount == null) continue
      const payee = (r.recipient_name || 'UNKNOWN').trim()
      rows.push({
        id: String(r.sub_id),
        date: r.disbursement_date.slice(0, 10),
        amount: r.disbursement_amount,
        payee,
        payeeKey: normalize(payee) || 'UNKNOWN',
        purpose: r.disbursement_description || '',
        category: r.disbursement_purpose_category || 'OTHER',
        memo: r.memo_code === 'X',
      })
    }
    const last = data.pagination?.last_indexes
    if (!last || data.results.length === 0) break
    cursor = { last_index: last.last_index, last_disbursement_date: last.last_disbursement_date }
    if (page % 10 === 0) console.log(`  cycle ${cycle}: ${rows.length} rows`)
  }
  return rows
}

async function fetchReports(cycle: number) {
  const out: any[] = []
  for (let page = 1; ; page++) {
    const data = await get(`/committee/${COMMITTEE_ID}/reports/`, {
      cycle,
      per_page: 100,
      page,
      sort: 'coverage_end_date',
    })
    out.push(...data.results)
    if (page >= (data.pagination?.pages ?? 1)) break
  }
  return out
    .filter((r) => r.coverage_end_date)
    .map((r) => ({
      end: r.coverage_end_date.slice(0, 10),
      type: r.report_type_full as string,
      receipts: r.total_receipts_period ?? 0,
      disbursements: r.total_disbursements_period ?? 0,
      cashOnHand: r.cash_on_hand_end_period ?? 0,
    }))
}

const round = (n: number) => Math.round(n * 100) / 100

async function main() {
  await mkdir(OUT, { recursive: true })
  const committee = (await get(`/committee/${COMMITTEE_ID}/`, {})).results?.[0]
  console.log(`Committee: ${committee?.name} (${COMMITTEE_ID}); transactions ${TXN_CYCLES.join(', ')}; reports ${REPORT_CYCLES.join(', ')}`)

  const reports = new Map<string, Awaited<ReturnType<typeof fetchReports>>[number]>()
  for (const cycle of REPORT_CYCLES) {
    console.log(`Cycle ${cycle}: reports`)
    for (const r of await fetchReports(cycle)) reports.set(r.end, r)
  }

  const all = new Map<string, Txn>()
  for (const cycle of TXN_CYCLES) {
    console.log(`Cycle ${cycle}: disbursements`)
    for (const t of await fetchDisbursements(cycle)) all.set(t.id, t)
  }

  // Memo items are already counted elsewhere; exclude from aggregates, keep in the table.
  const txns = [...all.values()].sort((a, b) => b.date.localeCompare(a.date))
  const counted = txns.filter((t) => !t.memo && t.amount > 0)

  // Official monthly totals come from the filing reports, which cover every cycle cheaply.
  const monthly = new Map<string, number>()
  for (const r of reports.values()) monthly.set(r.end.slice(0, 7), (monthly.get(r.end.slice(0, 7)) ?? 0) + r.disbursements)
  const payees = new Map<string, { name: string; total: number; count: number; names: Map<string, number> }>()
  const categories = new Map<string, number>()
  for (const t of counted) {
    categories.set(t.category, (categories.get(t.category) ?? 0) + t.amount)
    const p = payees.get(t.payeeKey) ?? { name: t.payee, total: 0, count: 0, names: new Map() }
    p.total += t.amount
    p.count++
    p.names.set(t.payee, (p.names.get(t.payee) ?? 0) + t.amount)
    payees.set(t.payeeKey, p)
  }

  const write = (name: string, data: unknown) => writeFile(new URL(name, OUT), JSON.stringify(data))

  await write(
    'monthly.json',
    [...monthly].sort().map(([month, total]) => ({ month, total: round(total) })),
  )
  await write(
    'categories.json',
    [...categories].map(([category, total]) => ({ category, total: round(total) })).sort((a, b) => b.total - a.total),
  )
  await write(
    'payees.json',
    [...payees.values()]
      .map((p) => ({
        // most common raw spelling, by dollars
        name: [...p.names].sort((a, b) => b[1] - a[1])[0][0],
        total: round(p.total),
        count: p.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 200),
  )
  await write('reports.json', [...reports.values()].sort((a, b) => a.end.localeCompare(b.end)))

  const years = new Map<string, Txn[]>()
  for (const t of txns) years.set(t.date.slice(0, 4), [...(years.get(t.date.slice(0, 4)) ?? []), t])
  for (const [year, rows] of years) {
    await write(`transactions-${year}.json`, rows.map(({ payeeKey: _k, ...t }) => t))
  }

  await write('meta.json', {
    updated: new Date().toISOString(),
    committee: { id: COMMITTEE_ID, name: committee?.name ?? 'Democratic National Committee' },
    years: [...years.keys()].sort().reverse(),
    transactionCount: txns.length,
    truncated: Number.isFinite(MAX_PAGES),
    detailFrom: txns.length ? txns.at(-1)!.date : null,
  })
  console.log(`Wrote ${txns.length} transactions across ${years.size} years.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
