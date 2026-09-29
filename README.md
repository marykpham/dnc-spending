# DNC Spending Tracker

Static site tracking Democratic National Committee (FEC committee `C00010603`) disbursements and receipts from public FEC data. Built with Vite + React + TypeScript; deployed to GitHub Pages.

## How it works
`scripts/fetch-fec.ts` pulls disbursements and filing reports from the [OpenFEC API](https://api.open.fec.gov/developers/), aggregates them, and writes static JSON to `public/data/`. A scheduled GitHub Action refreshes and commits that JSON daily; pushing to `main` redeploys the site. The API key never reaches the browser.

## Setup
1. Get a free API key at https://api.data.gov/signup/.
2. Repo **Settings → Secrets and variables → Actions**: add `FEC_API_KEY`.
3. Repo **Settings → Pages**: set Source to **GitHub Actions**.
4. Run the **Update FEC data** workflow once (Actions tab); it commits the data, which triggers the deploy.

## Local development
```sh
FEC_API_KEY=your_key npm run fetch-data   # filing reports (last 3 cycles) + current-cycle disbursements
MAX_PAGES=3 npm run fetch-data            # quick partial fetch
TXN_CYCLES=2024,2026 npm run fetch-data   # also pull an older cycle's transactions (slow: the FEC API is)
npm run dev
```
`DEMO_KEY` (the default) is heavily rate limited; use a real key.

## Methodology
- Monthly and cash figures come from the committee's official filing reports. Payee, category and ledger detail comes from individual disbursements for the current two-year cycle.
- Memo items (`memo_code = X`) are shown in the ledger but excluded from payee/category totals to avoid double counting.
- Payees are grouped by normalized name (case, punctuation and company suffixes removed).
- FEC data lags filing deadlines and can be amended. Unofficial project, not affiliated with the FEC or DNC.
