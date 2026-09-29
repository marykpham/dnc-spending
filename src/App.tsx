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
  ['time', 'Over time', 'Timeline', OverTime],
  ['payees', 'Top payees', 'Payees', TopPayees],
  ['cash', 'Money in vs. out', 'In / out', ReceiptsVsSpending],
  ['txns', 'Ledger', 'Ledger', Transactions],
] as const
type TabId = (typeof TABS)[number][0]
const fromHash = (): TabId => TABS.find((t) => t[0] === location.hash.slice(1))?.[0] ?? 'time'

export default function App() {
  const [tab, setTab] = useState<TabId>(fromHash)
  const [paused, setPaused] = useState(false)
  const { data: meta } = useData<Meta>('meta.json')
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const mainRef = useRef<HTMLElement>(null)
  const [ind, setInd] = useState({ x: 0, w: 0 })
  const Active = TABS.find((t) => t[0] === tab)![3]

  const select = (id: TabId) => {
    setTab(id)
    history.replaceState(null, '', `#${id}`)
  }

  useEffect(() => {
    const onHash = () => setTab(fromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  // "Pause motion" freezes every animation on the page (WCAG 2.2.2)
  useEffect(() => {
    document.documentElement.toggleAttribute('data-paused', paused)
  }, [paused])

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

  // arrow-key navigation for the tab list
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t[0] === tab)
    const n =
      e.key === 'ArrowRight' ? (i + 1) % TABS.length
      : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : -1
    if (n < 0) return
    e.preventDefault()
    select(TABS[n][0])
    btns.current[n]?.focus()
  }

  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault() // the URL hash is used for tabs, so don't navigate
          mainRef.current?.focus()
        }}
      >
        Skip to content
      </a>
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
        <div className="top-right">
          <div className="live">
            <span className="pulse" aria-hidden />
            Live from the FEC{meta && <> · updated {new Date(meta.updated).toLocaleDateString()}</>}
          </div>
          <button className="motion-btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? 'Play motion' : 'Pause motion'}
          </button>
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1}>
        <section className="hero">
          <KineticTitle lines={['Follow the', 'money.']} />
          <p className="sub">
            Every dollar the Democratic National Committee (DNC) raises and spends, straight from its public filings.
          </p>
        </section>
        <FlowHero paused={paused} />
        <Stats />
        <details className="guide">
          <summary>New to campaign finance? A plain-English guide</summary>
          <dl>
            <dt>Where does this data come from?</dt>
            <dd>
              The Federal Election Commission (FEC). Political committees must file regular reports listing the money
              they take in and pay out. This site reads those public reports.
            </dd>
            <dt>Raised, spent, cash on hand</dt>
            <dd>
              <b>Raised</b> is money coming in, <b>spent</b> is money going out, and <b>cash on hand</b> is what was left
              in the bank at the end of the reporting period.
            </dd>
            <dt>Payee</dt>
            <dd>Whoever was paid: a vendor, a staff-benefits provider, a state party, a donor getting a refund.</dd>
            <dt>Memo items</dt>
            <dd>
              Entries already counted somewhere else in the same report, listed for detail. They are never added to
              totals, so you won’t see them counted twice here.
            </dd>
            <dt>Why isn’t this up to the minute?</dt>
            <dd>
              Reports are filed monthly, about 20 days after each month ends. The newest numbers are always a few weeks
              old.
            </dd>
          </dl>
        </details>
        <nav aria-label="Sections">
          <div className="tabs" role="tablist" aria-label="Sections" onKeyDown={onTabKey}>
            <span className="ind" aria-hidden style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />
            {TABS.map(([id, label, short], i) => (
              <button
                key={id}
                ref={(el) => {
                  btns.current[i] = el
                }}
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls="panel"
                tabIndex={tab === id ? 0 : -1}
                className={tab === id ? 'on' : ''}
                onClick={() => select(id)}
              >
                <span className="lg">{label}</span>
                <span className="sh" aria-hidden>
                  {short}
                </span>
              </button>
            ))}
          </div>
        </nav>
        <div className="panel" id="panel" role="tabpanel" aria-labelledby={`tab-${tab}`} key={tab}>
          <Active />
        </div>
      </main>
      <footer>
        <div className="foot-grid">
          <div>
            <p className="foot-h">Source</p>
            <p>
              Public reports filed with the{' '}
              <a href="https://www.fec.gov/data/committee/C00010603/" target="_blank" rel="noreferrer">
                FEC (opens in a new tab)
              </a>
              , read through the OpenFEC API. Monthly totals go back to 2021; payee, category and ledger detail covers{' '}
              {meta?.detailFrom ? new Date(meta.detailFrom).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'recent months'}{' '}
              onward.
            </p>
          </div>
          <div>
            <p className="foot-h">Good to know</p>
            <p>
              Memo items are left out of payee and ledger totals to avoid double counting. Reports arrive weeks after
              the period they cover and can be amended later. Payee names are grouped by spelling, so a few may be
              split or merged imperfectly.
            </p>
          </div>
          <div>
            <p className="foot-h">About</p>
            <p>An independent project, not affiliated with the FEC or the DNC. Figures are for information only. Visit counts are
              measured with cookieless analytics that collect no personal data.
            </p>
          </div>
        </div>
        {meta?.truncated && <p className="error">This is a partial dataset (limited fetch).</p>}
      </footer>
    </>
  )
}
