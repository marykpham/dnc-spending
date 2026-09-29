const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const money = (n: number) => usd.format(n)
export const moneyCompact = (n: number) => usdCompact.format(n)

const ACRONYMS = new Set([
  'LLC', 'LLP', 'LP', 'PC', 'PAC', 'DNC', 'DCCC', 'DSCC', 'NGP', 'VAN', 'USA', 'US', 'DC', 'NY', 'II', 'III',
  'IT', 'HQ', 'ABC', 'CBS', 'NBC', 'CNN', 'AFL-CIO', 'SEIU', 'WY', 'VA', 'NH', 'NM', 'NV', 'NC', 'ND', 'SD', 'NJ',
])

export function titleCase(s: string) {
  return s
    .split(/(\s+)/)
    .map((w) => {
      if (ACRONYMS.has(w.replace(/[.,]/g, '').toUpperCase())) return w.toUpperCase()
      return w.toLowerCase().replace(/(^|[/(-])([a-z])/g, (_, a: string, c: string) => a + c.toUpperCase())
    })
    .join('')
}

export const plural = (n: number, one: string, many = one + 's') => `${n.toLocaleString()} ${n === 1 ? one : many}`

export function quarterOf(month: string) {
  const [y, m] = month.split('-')
  return `${y} Q${Math.ceil(Number(m) / 3)}`
}
