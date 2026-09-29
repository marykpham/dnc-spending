import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FlowHero } from './components/FlowHero'
import { KineticTitle } from './components/KineticTitle'
import { OverTime } from './components/OverTime'
import { ReceiptsVsSpending } from './components/ReceiptsVsSpending'
import { Stats } from './components/Stats'
import { Ticker } from './components/Ticker'
import { TopPayees } from './components/TopPayees'
import { Transactions } from './components/Transactions'
import type { Meta } from './lib/data'
import { useData } from './lib/useData'

const TABS = [
  ['time', 'Over time', OverTime],
  ['payees', 'Top payees', TopPayees],
  ['cash', 'Receipts vs. spending', ReceiptsVsSpending],
  ['txns', 'Ledger', Transactions],
] as const
type TabId = (typeof TABS)[number][0]
const fromHash = (): TabId => TABS.find((t) => t[0] === location.hash.slice(1))?.[0] ?? 'time'

export default function App() {
  const [tab, setTab] = useState<TabId>(fromHash)
  const { data: meta } = useData<Meta>('meta.json')
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const [ind, setInd] = useState({ x: 0, w: 0 })
  const Active = TABS.find((t) => t[0] === tab)![2]

  useEffect(() => {
    const onHash = () => setTab(fromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  // sliding tab indicator
  useLayoutEffect(() => {
    const measure = () => {
      const b = btns.current[TABS.findIndex((t) => t[0] === tab)]
      if (b) setInd({ x: b.offsetLeft, w: b.offsetWidth })
    }
    measure()
    addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => removeEventListener('resize', measure)
  }, [tab])

  // cursor spotlight
  useEffect(() => {
    let raf = 0
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mx', `${e.clientX}px`)
        document.documentElement.style.setProperty('--my', `${e.clientY}px`)
      })
    }
    addEventListener('pointermove', on)
    return () => {
      removeEventListener('pointermove', on)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <Ticker />
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          DNC Spending Tracker
        </div>
        <div className="live">
          <span className="pulse" />
          Live from the FEC{meta && <> · updated {new Date(meta.updated).toLocaleDateString()}</>}
        </div>
      </header>
      <main>
        <section className="hero">
          <KineticTitle lines={['Follow the', 'money.']} />
          <p className="sub">
            Every dollar the Democratic National Committee raises and spends, straight from its public filings.
          </p>
        </section>
        <FlowHero />
        <Stats />
        <nav className="tabs">
          <span className="ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />
          {TABS.map(([id, label], i) => (
            <button
              key={id}
              ref={(el) => {
                btns.current[i] = el
              }}
              className={tab === id ? 'on' : ''}
              onClick={() => {
                setTab(id)
                history.replaceState(null, '', `#${id}`)
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="panel" key={tab}>
          <Active />
        </div>
      </main>
      <footer>
        <p>
          Source:{' '}
          <a href="https://www.fec.gov/data/committee/C00010603/" target="_blank" rel="noreferrer">
            FEC filings
          </a>{' '}
          via the OpenFEC API. Monthly totals and filings go back to 2021; payee, category and ledger detail covers{' '}
          {meta?.detailFrom ?? 'recent months'} onward. Payee and ledger figures exclude memo items to avoid double counting. Data lags filing deadlines and is
          subject to amendment; payee names are grouped by normalized spelling and may not be perfect. Unofficial
          project, not affiliated with the FEC or the DNC.
        </p>
        {meta?.truncated && <p className="error">This is a partial dataset (limited fetch).</p>}
      </footer>
    </>
  )
}
