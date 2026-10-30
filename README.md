# Spendwise — Personal Expense Tracking & Analytics

**Full-stack personal finance MVP** built with Next.js, TypeScript, Supabase (PostgreSQL), and Recharts. Spendwise turns manually recorded purchases, CSV statements, and experimental iOS Shortcuts transaction events into organized spending insights.

**[Try the public interactive demo](https://spendwise-mvp-giqp.vercel.app/demo)** · **[Private sign-in](https://spendwise-mvp-giqp.vercel.app)**

> **Project status:** The dashboard, database-backed accounts, transaction API, categorization, budgets, CSV import/export, and reports are implemented. **Automatic capture of real Apple Wallet transactions is experimental and not yet verified end-to-end.** The `/demo` page uses fictional local-only data; it is safe to explore without an account.
>
> The public demo link will work **after the proposed portfolio changes are built and deployed**; until then it may return 404.

## Why I built it

I wanted a low-friction way to understand everyday spending without manually entering every purchase. Spendwise explores how to combine a lightweight automation workflow with a private data dashboard, while accounting for real financial-data constraints such as missing transactions, duplicates, and pending card authorizations.

## What works today

| Feature | Implementation |
| --- | --- |
| Interactive spending dashboard | Monthly totals, category breakdown, six-month trend, top merchants |
| Transaction management | Add, search, filter, recategorize, confirm, or delete expenses |
| Merchant-based classification | Deterministic rules; user corrections saved for future matches |
| Budget tracking | Configurable CAD budget by month, remaining-balance comparison |
| Statement processing | CSV upload with column mapping and sign convention; export CSV |
| Monthly report | Generated from transactions; browser **Print / Save as PDF** |
| Private accounts | Supabase email OTP, PostgreSQL Row Level Security (RLS) |
| Transaction ingestion | Authenticated `POST /api/ingest`, validation, normalized amounts, best-effort deduplication |
| Portfolio demo | `/demo` provides fictional editable transactions in browser localStorage; **does not query Supabase** |
| Quality checks | TypeScript check, classification tests, Next.js production build in GitHub Actions |

### Not yet production-ready

- End-to-end automation from a **real** supported Apple Wallet payment through Shortcuts into the dashboard is **pending validation**. Apple Wallet automation depends on device, card, region and iOS support.
- Transaction ingestion currently uses one configured `SHORTCUT_USER_ID` and a private ingestion key. This is a **single-account prototype**, not a self-service multi-user bank connection.
- The duplicate check uses `external_id` when available; otherwise it uses a 90-second merchant-and-amount heuristic, which can incorrectly collapse legitimate repeat purchases.
- Import assumes CAD purchase rows; it is not a full bank-statement reconciliation engine. Wallet pending authorizations may differ from settled charges.
- No bank credential, card number, Apple Pay token, or payment authorization is requested or stored.

## System design

```text
                                      +------------------------------+
 Public visitor ---> /demo ----------> | In-browser fictional data    |
                                      | localStorage only            |
                                      +------------------------------+

 Private user ---> Email magic link ---> Supabase Auth
                                             |
                                       User-specific RLS
                                             |
       Manual entry / CSV import ------------+----> PostgreSQL
                                             |           |
 Apple Wallet trigger (experimental)         |           v
       |                                     |     Next.js Dashboard
       v                                     |     charts + budgets
 iOS Shortcuts HTTPS POST                    |
       |                                     |
       v                                     |
 POST /api/ingest --- API key, validation ---+
       |                     |
       +--- category rules ---+-- duplicate checks -- inserts pending transaction
```

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, CSS, Recharts
- **Backend:** Next.js route handlers / REST API
- **Data & auth:** Supabase PostgreSQL, Supabase Auth, Row Level Security
- **Automation experiment:** iOS Shortcuts with supported Wallet transaction triggers
- **Deployment & quality:** Vercel, GitHub Actions, Node.js built-in test runner

## Explore the demo

The simplest recruiter walkthrough is **[spendwise-mvp-giqp.vercel.app/demo](https://spendwise-mvp-giqp.vercel.app/demo)**:

1. Explore the category donut chart, six-month trend, and monthly budget.
2. Open **Transactions**; search, filter, or change a merchant's category.
3. Add an expense and see the summary update.
4. Open **Monthly report** and use **Save as PDF** (browser print dialog).
5. Reset the fictional data under **Settings**.

**Privacy:** Demo changes are confined to your browser's `localStorage` and never use a real Supabase session. The landing page `/` remains available for authenticated private accounts.

## Run locally

Requirements: Node.js 20.9+ and npm. Supabase is optional for a local demo.

```bash
git clone https://github.com/Grace-LIky/spendwise-mvp.git
cd spendwise-mvp
npm ci
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000/demo`. For an authenticated instance, set the environment values from `.env.example`, run `supabase/schema.sql` in your own Supabase project's SQL Editor, then visit `/` and sign in.

> Do not commit `.env.local` or store financial statements, card numbers, tokens or credentials in this repository. The Supabase service-role key must be server-only.

## iOS Shortcuts ingestion experiment

An authorized Shortcut can POST a structured payload to the ingestion route:

```http
POST /api/ingest
Content-Type: application/json
X-Spendwise-Key: <your secret key>
```

```json
{
  "merchant": "Example Coffee Shop",
  "amount": "8.50",
  "currency": "CAD",
  "occurred_at": "2026-10-30T12:00:00-04:00",
  "external_id": "example-transaction-id"
}
```

The endpoint only accepts positive CAD purchases, checks the ingestion key, maps a merchant category, and creates a `pending` transaction. Real Wallet-trigger automation remains experimental, as noted above.

## Validation

```bash
npm test                # merchant classification and override tests
npm run typecheck       # TypeScript static check
npm run build           # Next.js production build
```

GitHub Actions runs these checks on pull requests and pushes to `main`. See [`docs/testing-checklist.md`](docs/testing-checklist.md) for browser-level privacy and feature tests.

## Engineering trade-offs

- **Rule-based vs ML classification:** explicit merchant rules give predictable, explainable output and let user overrides take precedence. Generalization remains limited to known patterns.
- **Cents vs floating point:** purchases are stored as integer cents to avoid floating-point rounding errors.
- **Manual confirmation:** Wallet amounts may be temporary authorizations, so ingested transactions start as `pending`.
- **Usable before full automation:** manual and CSV imports provide value even when Wallet automation misses a purchase.
- **Demo isolation:** fictional portfolio data lives outside the private PostgreSQL project.

## Roadmap

- [x] REST ingestion route, schema, account isolation and basic categorization
- [x] Spending visualization, transaction ledger, monthly budgets and reporting
- [x] CSV import/export and manual corrections
- [x] Public sample-data demo and basic CI checks
- [ ] Validate real supported Wallet transactions end-to-end
- [ ] Replace heuristic deduplication with reliable transaction identifiers where available
- [ ] Add wider automated API/database tests and rate limiting
- [ ] Improve statement reconciliation and handling of refunds / FX
- [ ] Capture privacy-safe screenshots / short demo video

## Author

**Grace Li** · University of Toronto · Computer Science and Statistical Sciences

[GitHub](https://github.com/Grace-LIky) · [Live demo](https://spendwise-mvp-giqp.vercel.app/demo)

*Independent educational project. Not financial advice, a banking integration, or a financial reporting service.*
