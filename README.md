# Spendwise MVP

A private, CAD-only personal spending dashboard with Apple Wallet Shortcuts ingestion, auto-categorization, monthly reports, editable categories and CSV import. Built with Next.js, React, TypeScript, Recharts and Supabase.

> **Important:** This is a starter app, not a bank-certified application. Do not input TD login credentials, PAN/card numbers, CVV, or payment tokens. Apple Wallet transaction amounts can be preliminary. Reconcile against your TD statement.

## Current features

- Responsive dashboard: monthly totals, budget bar, category donut, six-month trend, most-used merchants and recent transactions.
- Transactions: search, filter, change category, confirm pending Apple Pay charges, delete, CSV export.
- Automatic merchant classification with rules and merchant-specific corrections remembered for future Apple Pay transactions.
- Manual expense entry.
- CSV import with user-selected columns, sign direction and preview. Supports `YYYY-MM-DD` / `MM/DD/YYYY`. CSV imported purchase amounts must be **CAD**.
- Instantly generated monthly report, print/save as PDF.
- Local demo mode with simulated transactions and localStorage persistence; *not* authenticated, *not* for sensitive data.
- Optional Supabase production mode: email link sign-in + PostgreSQL RLS per user.
- Secure server-side Apple Pay Shortcut POST endpoint (`/api/ingest`) using a secret header; does **not** require banking credentials.

## 1. Run the app locally (demo mode)

Requires Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. When the `NEXT_PUBLIC_*` variables are empty, the app is in **demo mode**. Use this to explore the UI and simulated expense data. You can add expenses, edit categories, import CSV, set budgets, and generate reports. No actual bank or Apple Pay connection is active.

## 2. Enable a private database (Supabase)

1. Create a Supabase project at https://supabase.com/.
2. Open **SQL Editor** and execute `supabase/schema.sql`.
3. In **Authentication → Providers**, enable email sign-in (confirm magic link/OTP is configured).
4. In **Authentication → URL Configuration**, set the Site URL to the final deployed HTTPS origin and add your local origin `http://localhost:3000` under Redirect URLs for local testing.
5. From **Project Settings → API Keys**, copy project URL and the publishable/anon key. Put these in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_SERVICE_ROLE_KEY
```

6. Restart `npm run dev`. The app will require an email sign-in link. Use an inbox that belongs to you. After signing in, data will be saved to Supabase. **Demo data is not migrated.**
7. Find your own authenticated Supabase user UUID in **Authentication → Users**; copy only the UUID (not a password).

**Security:** `SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. It must only be used on the backend; never commit to Git, paste into client-side code, or expose with `NEXT_PUBLIC_`. The SQL enables row-level security for all user-owned tables. For personal use, disable public signups/invitations after creating your account if appropriate to your setup.

## 3. Configure the Apple Pay endpoint

Add these extra **server-only** variables to `.env.local` and your Vercel project Environment Variables:

```env
SHORTCUT_INGEST_KEY=USE_A_RANDOM_SECRET_OF_32_PLUS_BYTES
SHORTCUT_USER_ID=YOUR_SUPABASE_AUTH_USER_UUID
```

Generate a random token with:

```bash
openssl rand -hex 32
```

Deploy your project to Vercel (import it from GitHub) with all five environment variables configured. Ingestion requires HTTPS from your iPhone, so `localhost` is not reachable from your iPhone without an appropriate secure tunnel. The endpoint is unavailable (503) until the variables are configured.

### First test the endpoint (using fabricated data only)

Replace the placeholder values; `curl` will return `201` when a new transaction is created. This is an explicit authorized test that adds a **test charge** to your actual Spendwise DB; delete it in the dashboard afterward.

```bash
curl -i https://YOUR-APP.vercel.app/api/ingest \
  -H 'Content-Type: application/json' \
  -H 'X-Spendwise-Key: YOUR_RANDOM_SECRET' \
  -d '{"merchant":"Spendwise Test Merchant","amount":"1.23","currency":"CAD","external_id":"test-001"}'
```

Repeating the exact request with the same `external_id` should return `{ "ok": true, "duplicate": true }`.

## 4. Test iPhone Wallet Transaction automation

**First run a notification-only experiment:**

1. iPhone **Shortcuts** → **Automation** → `+` → `Transaction` (or `Wallet`, depending on iOS version).
2. In **When I tap**, select your **TD Credit Card** and choose **Run Immediately** → **Next** → **New Blank Automation**.
3. Add **Text** with `Merchant: ` + the magic variable **Shortcut Input → Merchant**, and `Amount: ` + **Shortcut Input → Amount**.
4. Add **Show Notification** using the Text result. Save.
5. On your next normal, in-person Apple Pay payment with that card, see whether the automation displays the amount and merchant. Do not make an unnecessary purchase solely to test.

A successful notification shows Shortcuts can receive those fields for *your* card/iPhone. It does not establish coverage of online Apple Pay, Apple Watch payments, all banks, or every purchase.

**Once the endpoint has been tested and deployed:**

1. Edit your automation, replacing or following the notification step with **Get Contents of URL**.
2. URL: `https://YOUR-APP.vercel.app/api/ingest`
3. Method: **POST**. Add header `X-Spendwise-Key` with your secret.
4. Choose **Request Body → JSON** and add:
   - `merchant`: select **Shortcut Input → Merchant**
   - `amount`: select **Shortcut Input → Amount**
   - `currency`: enter literal `CAD`
5. Save and test with your next normal in-store purchase. Check the dashboard **Transactions** view. New Apple Pay entries are marked **Pending** until you confirm against your TD account statement.

The exact Shortcuts UI may differ by iOS version. If `Shortcut Input` is not listed, tap the input field and use **Select Variable**. Verify what the actual Amount field contains; it must be a plain decimal or `CAD`, `CA$` or `$`-prefixed amount for the API parser. The trigger does not provide a reliable settled timestamp, so the backend uses the time it receives the request if `occurred_at` is missing. Wallet merchant/amount are subject to issuer availability.

## 5. Bring in TD expenses not captured by Wallet

Download a CSV transaction export from TD EasyWeb if available for your specific card/account. Use the **Transactions → Import CSV** control and pick the header columns representing date, merchant and amount. Choose whether purchases are positive or negative. Preview a few rows carefully before importing; rows with the opposite sign are skipped. The importer handles simple CSV exports (quoted commas are supported), not all specialized TD formats, and assumes amounts are *already CAD*. It does not perform currency conversion or calculate refunds/payments. Review imported totals against your bank statement before relying on them.

Use **Report → Save as PDF** for a printable summary, or **Transactions → Export** for the normalized CSV of the selected month. These reports are generated **on demand**. Recurring email delivery and historical Apple Wallet backfill are **not** part of v0.1.

## Useful routes

- `GET /` — dashboard, email login or demo mode
- `POST /api/ingest` — Apple Pay Shortcuts server endpoint; requires secret header

## Data handling / current limitations

- **Only CAD** is accepted in the webhook; the reports never silently add CAD to another currency.
- Records from Wallet are **pending authorizations**. No direct settlement reconciliation with TD yet.
- CSV imports may duplicate a Wallet record representing the same expense; this needs manual review. A future bank-sync reconciliation module will match bank-posted transactions to pending records.
- The webhook has a best-effort 90-second same-merchant/same-amount duplicate check if `external_id` is absent. Two truly identical purchases made within that window could be treated as one; use `external_id` if a reliable unique transaction identifier becomes available.
- This MVP assumes one currency and one primary owner configured by `SHORTCUT_USER_ID`. Sharing the deployed URL does not authorize other users to read the owner's transactions. For real-world multiuser usage, replace the single-owner webhook design with per-user scoped keys and proper key rotation, and add abuse protection and auditing.
- The dashboard retrieves up to 2,000 records per load. Add server-side pagination for larger history.
- Neither Apple FinanceKit nor TD banking credentials are required; this is Shortcuts-triggered logging, not an officially supported universal Apple Pay history API.

## Suggested next milestones

1. Verify your TD Credit Card transaction notification on device.
2. Set up Supabase and deploy your private site.
3. Send a fabricated test transaction via `curl`; then link the Shortcut.
4. Compare the first 5–10 auto-created entries against TD posted transactions.
5. Build reconciliation and recurring monthly delivery, then evaluate Plaid availability/cost for the actual TD credit account.
