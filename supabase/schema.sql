-- Spendwise: execute in Supabase SQL Editor, once per new project.
-- WARNING: do not store card numbers, credentials, CVVs or Apple Pay tokens.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant text not null check (char_length(merchant) between 1 and 160),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  category text not null default 'Other',
  occurred_at timestamptz not null default now(),
  source text not null check (source in ('apple_pay', 'manual', 'csv')),
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  notes text,
  external_id text,
  created_at timestamptz not null default now(),
  unique (user_id, external_id)
);
create index if not exists ix_transactions_user_time on public.transactions (user_id, occurred_at desc);

create table if not exists public.merchant_rules (
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_key text not null,
  category text not null,
  primary key (user_id, merchant_key)
);

create table if not exists public.budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  amount_cents integer not null check (amount_cents > 0),
  primary key (user_id, month)
);

alter table public.transactions enable row level security;
alter table public.merchant_rules enable row level security;
alter table public.budgets enable row level security;

-- Per-user isolation: no signed-in user can read or edit another user's financial data.
drop policy if exists "owner manage transactions" on public.transactions;
create policy "owner manage transactions" on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "owner manage merchant rules" on public.merchant_rules;
create policy "owner manage merchant rules" on public.merchant_rules for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "owner manage budgets" on public.budgets;
create policy "owner manage budgets" on public.budgets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
