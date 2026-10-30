
# Spendwise 

### Automated Personal Finance & Expense Tracking Platform

Spendwise is a full-stack personal finance web application that simplifies expense tracking through **Apple Pay automation, intelligent expense categorization, and interactive financial analytics**.

Built with **Next.js, TypeScript, Supabase, and iOS Shortcuts**, Spendwise helps users understand their spending habits, monitor monthly budgets, and visualize financial trends without manually recording every transaction.

 **Live Demo:** https://spendwise-mvp-giqp.vercel.app

##  Features

###  Apple Pay Transaction Automation
- Integrates with Apple Wallet transaction triggers using iOS Shortcuts.
- Sends supported Apple Pay transaction data to a secure REST API.
- Automatically captures merchant information and transaction amounts when available.
- Stores incoming transactions in a PostgreSQL database.
- Supports transaction review and reconciliation.

###  Automatic Expense Categorization
- Automatically classifies expenses based on merchant names.
- Supports categories including:
  - Food & Drinks
  - Groceries
  - Shopping
  - Transportation
  - Entertainment
  - Other
- Allows users to manually correct transaction categories.
- Supports merchant-based classification rules.

###  Interactive Financial Dashboard
- Displays total monthly spending.
- Visualizes spending distribution by category.
- Tracks spending trends across multiple months.
- Provides an overview of recent transactions.
- Compares expenses against monthly budgets.

###  Budget Management
- Tracks monthly spending against a configurable budget.
- Displays budget utilization and remaining balance.
- Helps users identify spending patterns.

###  Transaction Management
- Add expenses manually.
- Review and categorize transactions.
- Search transaction history.
- Import transaction records from CSV files.
- Review automatically captured transactions.

###  Monthly Spending Reports
- Generates monthly spending summaries.
- Visualizes spending patterns with interactive charts.
- Provides insights into spending categories and trends.
- Supports exporting reports as PDF.

##  Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, React, TypeScript |
| Styling | CSS |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Data Visualization | Recharts |
| Automation | Apple Shortcuts |
| Deployment | Vercel |
| Version Control | Git & GitHub |

##  System Architecture

```text
       Apple Pay Transaction
                |
                v
       iOS Shortcuts Automation
                |
                | HTTPS POST Request
                v
       Next.js REST API
          /api/ingest
                |
                v
       Transaction Validation
                |
                v
       Merchant Categorization
                |
                v
       Supabase PostgreSQL
                |
                v
       Next.js Dashboard
                |
        +-------+-------+
        |       |       |
        v       v       v
    Spending  Monthly  Category
    History   Reports  Analytics
```

##  Getting Started

### Prerequisites

- Node.js 20.9 or later
- npm
- Supabase project
- Git

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Grace-LIky/spendwise-mvp.git
cd spendwise-mvp
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

```bash
cp .env.example .env.local
```

Update `.env.local` with your own credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key

SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key
SHORTCUT_INGEST_KEY=your_random_ingest_key
SHORTCUT_USER_ID=your_supabase_user_id
```

**4. Set up the database**

Open the Supabase SQL Editor and execute:

```text
supabase/schema.sql
```

**5. Start the development server**

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 📱 Apple Pay Integration

Spendwise uses an iOS Shortcuts Wallet Transaction Automation to transmit supported transaction details to the backend.

### Configuration

1. Open the Shortcuts app on your iPhone.
2. Navigate to **Automation**.
3. Create a **Transaction** automation.
4. Select the desired Apple Wallet card.
5. Configure the automation to run immediately.
6. Add a **URL** action pointing to:

```text
https://your-domain.vercel.app/api/ingest
```

7. Add **Get Contents of URL** with the following settings:

**Method:** `POST`

**Header:**

```text
X-Spendwise-Key: YOUR_INGEST_KEY
```

**JSON Request Body:**

```json
{
  "merchant": "Merchant variable",
  "amount": "Amount variable",
  "currency": "CAD"
}
```

Replace the example values with the corresponding dynamic Wallet transaction variables.

### Limitations

- Wallet automation availability depends on supported cards, devices, and iOS functionality.
- Not all online Apple Pay transactions are captured by Wallet transaction triggers.
- Transaction amounts may differ from final posted bank statement amounts.
- Historical transactions may require CSV import.
- Real-world automated Wallet transaction capture is awaiting end-to-end validation.

##  Security

Spendwise is designed to keep personal financial information separate from publicly available source code.

- Environment variables are used for sensitive credentials.
- The transaction ingestion endpoint requires an API key.
- Supabase Authentication protects user sessions.
- Database access is controlled through Row Level Security policies.
- Secret keys must remain on the server and must never be exposed through client-side environment variables.

**Never commit `.env.local`, private API keys, financial statements, or personal transaction exports to GitHub.**

##  Testing

The MVP has been tested using simulated transactions.

| Test | Status |
|------|--------|
| Local development server | Passed |
| Supabase transaction ingestion | Passed |
| Vercel production API | Passed |
| iPhone Shortcuts HTTP POST | Passed |
| Wallet automation configuration | Completed |
| Real Apple Pay transaction capture | Pending |

##  Roadmap

- [x] Build the full-stack MVP
- [x] Implement transaction ingestion API
- [x] Integrate Supabase PostgreSQL
- [x] Implement merchant-based categorization
- [x] Build financial visualization dashboard
- [x] Deploy application to Vercel
- [x] Configure iOS Shortcuts automation
- [ ] Validate real-world Apple Pay transactions
- [ ] Improve automatic categorization accuracy
- [ ] Implement robust duplicate transaction detection
- [ ] Add bank statement reconciliation
- [ ] Expand monthly financial analytics
- [ ] Improve mobile user experience

##  Author

**Grace Li**

University of Toronto | Computer Science & Statistical Sciences

GitHub: [@Grace-LIky](https://github.com/Grace-LIky)

---

*Spendwise is an independently developed personal project exploring financial automation, full-stack software engineering, and data-driven financial insights.*
