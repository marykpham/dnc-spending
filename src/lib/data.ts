export interface Meta {
  updated: string
  committee: { id: string; name: string }
  years: string[]
  transactionCount: number
  detailFrom?: string | null
  truncated: boolean
}
export interface MonthlyTotal { month: string; total: number }
export interface Payee { name: string; total: number; count: number }
export interface CategoryTotal { category: string; total: number }
export interface Report { end: string; type: string; receipts: number; disbursements: number; cashOnHand: number }
export interface Txn {
  id: string
  date: string
  amount: number
  payee: string
  purpose: string
  category: string
  memo: boolean
}

const cache = new Map<string, Promise<unknown>>()

export function load<T>(file: string): Promise<T> {
  let p = cache.get(file)
  if (!p) {
    // 'no-cache' revalidates with the server (cheap 304s) so a redeploy is never masked by a stale browser copy.
    p = fetch(`${import.meta.env.BASE_URL}data/${file}`, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${file} (${r.status})`)
      return r.json()
    })
    cache.set(file, p)
  }
  return p as Promise<T>
}
