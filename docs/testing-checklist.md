# Spendwise Portfolio Release Checklist

## Automated checks

- [ ] `npm ci` succeeds with Node 20
- [ ] `npm test` passes categorization and override tests
- [ ] `npm run typecheck` succeeds
- [ ] `npm run build` succeeds
- [ ] GitHub Actions CI shows green on PR

## Public demo (`/demo`)

- [ ] Open `/demo` in a fresh private/incognito window WITHOUT signing in
- [ ] See explicit fictional-data Demo banner
- [ ] View Overview dashboard, charts, and transaction examples
- [ ] Add a manual expense; monthly total updates
- [ ] Change Loblaws category; future matching merchants follow the chosen rule
- [ ] Import `docs/sample-transactions.csv` and inspect results
- [ ] Export CSV; confirm contents are fictional
- [ ] Open Monthly Report, use browser **Save as PDF**
- [ ] Reload and confirm demo state stays in this browser only
- [ ] Reset demo data from Settings
- [ ] Check mobile layout and browser console for errors

## Private-data isolation — critical

- [ ] `/demo` must not request private Supabase transaction tables in browser network panel
- [ ] `/demo` should not show your personal name, private transactions or card data
- [ ] Demo mutations must not create/update rows in your Supabase project
- [ ] Visiting `/` still shows normal account sign-in when signed out
- [ ] Signing into `/` does not expose private data in `/demo`
- [ ] Without `X-Spendwise-Key`, `POST /api/ingest` returns HTTP 401
- [ ] With invalid amounts or non-CAD currencies, endpoint rejects request
- [ ] Never share secrets in screenshots, source code, README or LinkedIn

## Ship

- [ ] Create git branch, review `git diff`, commit
- [ ] Push branch and open PR; review CI
- [ ] Merge after tests; wait until deployment is complete
- [ ] Confirm production `/demo` URL works
- [ ] Add screenshot(s) from sample-data demo to README or LinkedIn
- [ ] Add GitHub link to LinkedIn Projects; publish the post only after final validation
