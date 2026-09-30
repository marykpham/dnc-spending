# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static Vite + React + TypeScript site (deployed to GitHub Pages at `marykpham/dnc-spending`) that visualizes DNC (FEC committee `C00010603`) spending from public FEC filings. There is no backend: a Node script writes JSON into `public/data/`, the JSON is committed, and the SPA reads it at runtime.

## Commands

```sh
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # tsc -b && vite build  (typecheck is part of the build)
npm run lint         # oxlint (a few React-compiler warnings are known and non-blocking)
npm run preview      # serve the production build
npm run fetch-data   # regenerate public/data/*.json from the OpenFEC API
```

There is no test suite. Verify UI work by typechecking, building, and looking at it in Chrome (see "Verifying UI" below).

`fetch-data` env: `FEC_API_KEY` (default `DEMO_KEY`, which is rate-limited into uselessness), `TXN_CYCLES` (default: current two-year cycle), `REPORT_CYCLES` (default: last three), `MAX_PAGES` (per-cycle cap for quick partial runs, e.g. `MAX_PAGES=3 npm run fetch-data`). A partial run sets `truncated: true` in `meta.json`, which the UI surfaces as a "partial dataset" notice.

## Architecture

**Data pipeline (the part that needs several files to understand)**

`scripts/fetch-fec.ts` → `public/data/*.json` (committed) → `src/lib/data.ts` `load()` → components.
- Two GitHub Actions: `update-data.yml` (daily cron + manual; runs the fetch, commits changed JSON) and `deploy.yml` (Pages build). Commits pushed with `GITHUB_TOKEN` do **not** trigger `push` workflows, so `deploy.yml` also listens to `workflow_run` on "Update FEC data" (and skips if that run failed). Don't remove that trigger.
- `FEC_API_KEY` is a repo Actions secret; it must never reach the browser.
- **Two data sources with different coverage.** `monthly.json`, `reports.json` (and so the hero stats, Over-time and Money-in-vs-out views) come from the committee *filing reports* and span 2021→present. `payees.json`, `categories.json` and `transactions-{year}.json` come from individual Schedule B disbursements for the current cycle only (Jan of the cycle's first year onward; rows dated earlier are dropped as late-reported stragglers). The footer copy reads `meta.detailFrom` to say so.
- **Memo items** (`memo_code === 'X'`) are already counted elsewhere in a filing. They are excluded from payee/category aggregates and ledger totals but kept in the ledger (hidden by default via a toggle). Roughly two-thirds of rows are memo. Validated: non-memo sums track official monthly report totals within ~1–2% for 2026 (2025 months are looser); including memo rows overshoots by 25–30%.

**OpenFEC gotchas (learned the hard way)**
- `/committee/{id}/reports/` filters by `cycle`; the `two_year_period` param is silently ignored and returns the committee's whole history.
- `/schedules/schedule_b/` must be paged with keyset pagination (`last_index` + `last_disbursement_date`), not page numbers.
- Rate limit is ~1000 requests/hour per key plus a per-minute cap; 429s and 504s are normal. `get()` backs off (max 12 tries, 30s cap) then throws. Older cycles (esp. 2024, presidential year) are huge and flaky — don't add them to `TXN_CYCLES` casually.
- The daily job is incremental: it loads the stored `transactions-*.json`, fetches only rows since the newest one minus a 21-day overlap (`min_disbursement_date`), and merges by id. `FULL=1` (or the `full` input on the manual workflow run) re-downloads everything; do that occasionally to catch very late filings. The workflow sets `ALLOW_STALE=1`, so a 429 that outlasts the retries keeps the old data and exits 0 with a warning instead of failing.

**Frontend**
- Tabs are routed by URL hash (`#time`, `#payees`, `#cash`, `#txns`). Because of that, in-page links like a skip link must not navigate to a hash (it would reset the tab); `App.tsx` handles it with `preventDefault` + `focus()`.
- Vite `base` is `'./'` and data is fetched via `import.meta.env.BASE_URL` so the build works under the Pages subpath. `load()` uses `cache: 'no-cache'` on purpose — without it browsers served stale `monthly.json` after a redeploy.
- Styling is one file, `src/index.css`, dark-only. Chart components still use legacy token names (`--ink`, `--accent`, `--teal`, `--rule`, …) which are aliases onto the current palette (`--text`, `--out`, `--in`, `--line`, …).
- `FlowHero` is a two-canvas animation: a static "river bed" underlay and a foreground that fades with `destination-out` for trails. It is driven by real data (`reports.json` averages, `payees.json` shares). It pauses when off-screen, when the `paused` prop is set, and under `prefers-reduced-motion`.
- "Pause motion" sets `html[data-paused]`, and CSS there disables all animations/transitions and forces reveal end-states. New animated CSS must have a matching end-state in that block and in the `prefers-reduced-motion` block.
- `Reveal` puts its IntersectionObserver on an **unclipped outer wrapper**; the `.wipe` clip-path is on the inner element. An element hidden by its own `clip-path` reports zero visible area and would never trigger.
- `KineticTitle` relies on `@property --k/--p` and the variable-font `wght`/`wdth` axes (Bricolage Grotesque, loaded from Google Fonts in `index.html`).
- The ledger (`Transactions.tsx`) is virtualized with `@tanstack/react-virtual`; row height differs at ≤700px (72px cards vs 40px rows) and `virt.measure()` is re-run when that flips. ARIA list semantics (`aria-setsize`/`aria-posinset`) are set manually because rows are virtualized. Charts are `aria-hidden` with a visually hidden `SrTable` alongside. (`@tanstack/react-table` is installed but unused.)

## Verifying UI

Headless Chrome's `--screenshot` and `--virtual-time-budget` do not advance CSS animations/transitions or reliably run the canvas, so screenshots show frame zero (invisible headline, empty canvas, odometers at 0). Drive Chrome over the DevTools protocol instead (launch with `--remote-debugging-port`, navigate, wait real time, then `Page.captureScreenshot`; use `Emulation.setDeviceMetricsOverride` with `mobile: true` for phone width, and `Input.dispatchMouseEvent` / `Runtime.evaluate` to interact). Check for horizontal overflow at 390px on every tab.
