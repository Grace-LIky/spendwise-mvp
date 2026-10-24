Spendwise 💸

An automated personal finance tracker powered by Apple Pay, Next.js, and Supabase.

Spendwise is a full-stack web application designed to simplify expense tracking through iOS Shortcuts automation, intelligent transaction categorization, and interactive financial dashboards.

Features

* Apple Pay Integration — Capture supported Wallet transactions through iOS Shortcuts and send them to a secure backend API.
* Automatic Expense Categorization — Classify transactions based on merchant information.
* Interactive Dashboard — Visualize monthly spending, category breakdowns, and spending trends.
* Budget Tracking — Monitor spending against monthly budgets.
* Transaction Management — Add, review, edit, and categorize expenses.
* Monthly Reports — Analyze spending patterns and export summaries.

Tech Stack

* Frontend: Next.js, TypeScript, React
* Backend: Next.js API Routes
* Database: Supabase PostgreSQL
* Authentication: Supabase Auth
* Visualization: Recharts
* Automation: Apple Shortcuts
* Deployment: Vercel

Architecture

Apple Pay → iOS Shortcuts → Next.js REST API → Supabase PostgreSQL → Spending Dashboard

Project Status

MVP — Active Development

The application has passed local and production API ingestion tests using simulated transactions. Real-world Apple Pay transaction automation is configured and awaiting end-to-end validation.

Future Improvements

* Expanded transaction categorization rules
* Duplicate transaction detection
* Bank statement reconciliation
* Improved monthly financial reports
* Enhanced mobile experience

Security

Sensitive credentials are stored in environment variables and must never be committed to the repository. Transaction ingestion uses a dedicated API key, and user data access is protected through authentication and database access controls.
