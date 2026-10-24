'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Banknote, CalendarDays, Check,
  CheckCircle2, ChevronDown, CircleHelp, CirclePlus, Coffee, CreditCard, Download,
  FileChartColumn, FileDown, FileUp, LayoutDashboard, LockKeyhole, LogOut, Menu,
  MoreHorizontal, Plus, Search, Settings2, ShieldCheck, ShoppingBag, Sparkles,
  Trash2, TrendingUp, Wallet, X
} from 'lucide-react';
import { Cell, Area, AreaChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { categorize, merchantKey } from '@/lib/categorize';
import { findHeader, parseCSV, parseCsvCents, parseDate } from '@/lib/csv';
import { connected, supabase } from '@/lib/supabase-browser';
import type { Budget, Category, MerchantRules, Transaction, TxSource } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';
import { csvEscape, demoTransactions, exportCsv, money, monthKey, monthLabel, previousMonth, sumSpent } from '@/lib/utils';

type Tab = 'overview' | 'transactions' | 'report' | 'settings';
type FormValue = { merchant: string; amount: string; category: Category | 'Auto'; notes: string; date: string };
type CsvMap = { date: number; merchant: number; amount: number };
const PIE_COLORS = ['#7564e8', '#3bbca7', '#f2ad63', '#6d9dea', '#eb7d93', '#a99cb5', '#cbd5e1', '#27a8ab', '#a8bb71', '#c2aacc'];
const tabs: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'transactions', label: 'Transactions', icon: CreditCard },
  { key: 'report', label: 'Monthly report', icon: FileChartColumn },
  { key: 'settings', label: 'Settings & setup', icon: Settings2 }
];
const cleanForm = (): FormValue => ({ merchant: '', amount: '', category: 'Auto', notes: '', date: new Date().toISOString().slice(0, 10) });
const fromMonth = (month: string, offset: number) => { const [year, m] = month.split('-').map(Number); const d = new Date(year, m - 1 + offset, 1); return monthKey(d); };
const labelDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
function IconForCategory({ category }: { category: Category }) {
  const common = { size: 17, strokeWidth: 2.1 };
  switch (category) {
    case 'Food & Drinks': return <Coffee {...common} />;
    case 'Shopping': return <ShoppingBag {...common} />;
    case 'Groceries': return <Wallet {...common} />;
    case 'Transport': return <ArrowRight {...common} />;
    default: return <Banknote {...common} />;
  }
}
function saveFile(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<MerchantRules>({});
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(connected);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ text: string; error?: boolean } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormValue>(cleanForm);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [sourceFilter, setSourceFilter] = useState('All sources');
  const [showImport, setShowImport] = useState(false);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMap, setCsvMap] = useState<CsvMap>({ date: 0, merchant: 1, amount: 2 });
  const [signConvention, setSignConvention] = useState<'positive' | 'negative'>('positive');
  const [budgetInput, setBudgetInput] = useState('');

  const notify = (text: string, error = false) => setBanner({ text, error });
  const loadAccount = useCallback(async () => {
    if (!supabase) return;
    const [t, r, b] = await Promise.all([
      supabase.from('transactions').select('id,user_id,merchant,amount_cents,currency,category,occurred_at,source,status,notes,external_id').order('occurred_at', { ascending: false }).limit(2000),
      supabase.from('merchant_rules').select('merchant_key,category'),
      supabase.from('budgets').select('month,amount_cents')
    ]);
    if (t.error || r.error || b.error) { notify((t.error ?? r.error ?? b.error)?.message ?? 'Could not load data', true); return; }
    setTxs(t.data as Transaction[]);
    setRules(Object.fromEntries((r.data ?? []).map(x => [x.merchant_key, x.category as Category])));
    setBudgets((b.data ?? []) as Budget[]);
  }, []);

  useEffect(() => {
    if (!connected || !supabase) {
      try {
        const raw = localStorage.getItem('spendwise-demo-v1');
        if (raw) {
          const data = JSON.parse(raw);
          setTxs(Array.isArray(data.txs) ? data.txs : demoTransactions());
          setRules(data.rules ?? {});
          setBudgets(Array.isArray(data.budgets) ? data.budgets : []);
        } else setTxs(demoTransactions());
      } catch { setTxs(demoTransactions()); }
      setReady(true); return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session); setAuthLoading(false); setReady(true);
      if (data.session) void loadAccount();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      // Avoid making the Supabase query synchronously inside auth callback.
      if (next) setTimeout(() => void loadAccount(), 0);
      else { setTxs([]); setRules({}); setBudgets([]); }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadAccount]);

  useEffect(() => {
    if (ready && !connected) localStorage.setItem('spendwise-demo-v1', JSON.stringify({ txs, rules, budgets }));
  }, [txs, rules, budgets, ready]);
  useEffect(() => {
    setBudgetInput(String((budgets.find(b => b.month === month)?.amount_cents ?? 200000) / 100));
  }, [month, budgets]);

  const currentTxs = useMemo(() => txs.filter(t => monthKey(t.occurred_at) === month && t.currency === 'CAD'), [txs, month]);
  const previousTxs = useMemo(() => txs.filter(t => monthKey(t.occurred_at) === previousMonth(month) && t.currency === 'CAD'), [txs, month]);
  const total = sumSpent(currentTxs);
  const prevTotal = sumSpent(previousTxs);
  const delta = prevTotal > 0 ? Math.round((total - prevTotal) / prevTotal * 100) : null;
  const budgetCents = budgets.find(b => b.month === month)?.amount_cents ?? 200000;
  const remaining = budgetCents - total;
  const over = total > budgetCents;
  const categorySpend = useMemo(() => CATEGORIES.map(category => ({ name: category, value: sumSpent(currentTxs.filter(t => t.category === category)) })).filter(x => x.value > 0).sort((a,b) => b.value - a.value), [currentTxs]);
  const merchants = useMemo(() => {
    const map = new Map<string, number>();
    currentTxs.forEach(t => map.set(t.merchant, (map.get(t.merchant) ?? 0) + t.amount_cents));
    return [...map.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
  }, [currentTxs]);
  const trend = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const m = fromMonth(month, i - 5);
    return { month: monthLabel(m).split(' ')[0], amount: sumSpent(txs.filter(t => monthKey(t.occurred_at) === m && t.currency === 'CAD')) / 100 };
  }), [txs, month]);
  const visibleTxs = useMemo(() => currentTxs.filter(t => {
    return (t.merchant.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())) &&
      (categoryFilter === 'All categories' || t.category === categoryFilter) &&
      (sourceFilter === 'All sources' || t.source === sourceFilter);
  }).sort((a,b) => b.occurred_at.localeCompare(a.occurred_at)), [currentTxs, search, categoryFilter, sourceFilter]);
  const pendingCount = currentTxs.filter(t => t.status === 'pending').length;

  async function login(e: React.FormEvent) {
    e.preventDefault(); if (!supabase || !email) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    notify(error ? error.message : 'Check your inbox for the secure sign-in link.', Boolean(error));
    setBusy(false);
  }
  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    const merchant = form.merchant.trim();
    const amt = form.amount.trim();
    if (!merchant || !/^\d+(?:\.\d{1,2})?$/.test(amt)) return notify('Enter merchant and a positive CAD amount (max 2 decimals).', true);
    const cents = Math.round(Number(amt) * 100);
    if (cents <= 0 || cents > 100000000 || Number.isNaN(new Date(`${form.date}T12:00:00`).getTime())) return notify('Amount or date is invalid.', true);
    const newTx: Transaction = { id: crypto.randomUUID(), merchant: merchant.slice(0, 160), amount_cents: cents,
      category: form.category === 'Auto' ? categorize(merchant, rules) : form.category, currency: 'CAD', occurred_at: new Date(`${form.date}T12:00:00`).toISOString(),
      source: 'manual', status: 'confirmed', notes: form.notes || null };
    setBusy(true);
    if (connected && supabase && session) {
      const { data, error } = await supabase.from('transactions').insert({ ...newTx, user_id: session.user.id }).select().single();
      if (error) { notify(error.message, true); setBusy(false); return; }
      setTxs(old => [data as Transaction, ...old]);
    } else setTxs(old => [newTx, ...old]);
    setShowAdd(false); setForm(cleanForm()); setBusy(false); notify('Transaction saved.');
  }
  async function changeCategory(tx: Transaction, category: Category) {
    setBusy(true);
    if (connected && supabase && session) {
      const a = await supabase.from('transactions').update({ category }).eq('id', tx.id);
      if (a.error) { notify(a.error.message, true); setBusy(false); return; }
      const b = await supabase.from('merchant_rules').upsert({ user_id: session.user.id, merchant_key: merchantKey(tx.merchant), category }, { onConflict: 'user_id,merchant_key' });
      if (b.error) notify('Category updated, but remembering merchant rule failed.', true);
    }
    setTxs(old => old.map(t => t.id === tx.id ? { ...t, category } : t));
    setRules(old => ({ ...old, [merchantKey(tx.merchant)]: category }));
    setBusy(false);
    notify('Category changed. Future matching merchants will use your choice.');
  }
  async function markConfirmed(tx: Transaction) {
    if (connected && supabase) {
      const { error } = await supabase.from('transactions').update({ status: 'confirmed' }).eq('id', tx.id);
      if (error) return notify(error.message, true);
    }
    setTxs(old => old.map(t => t.id === tx.id ? { ...t, status: 'confirmed' } : t));
    notify('Marked as confirmed. Compare with your TD statement for final amounts.');
  }
  async function deleteTransaction(tx: Transaction) {
    if (!window.confirm(`Delete ${tx.merchant} ${money(tx.amount_cents)}?`)) return;
    if (connected && supabase) {
      const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
      if (error) return notify(error.message, true);
    }
    setTxs(old => old.filter(t => t.id !== tx.id)); notify('Transaction deleted.');
  }
  async function setBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d+(?:\.\d{1,2})?$/.test(budgetInput) || Number(budgetInput) <= 0) return notify('Enter a positive CAD budget.', true);
    const cents = Math.round(Number(budgetInput) * 100);
    if (cents > 100000000) return notify('Budget is too high.', true);
    if (connected && supabase && session) {
      const { error } = await supabase.from('budgets').upsert({ month, amount_cents: cents, user_id: session.user.id }, { onConflict: 'user_id,month' });
      if (error) return notify(error.message, true);
    }
    setBudgets(old => [...old.filter(x => x.month !== month), { month, amount_cents: cents }]); notify('Monthly budget saved.');
  }
  async function selectFile(file: File) {
    if (file.size > 1024 * 1024) return notify('CSV must be smaller than 1 MB.', true);
    try {
      const rows = parseCSV(await file.text());
      if (rows.length < 2) return notify('CSV needs a header and at least one data row.', true);
      const headers = rows[0];
      setCsvMap({ date: Math.max(0, findHeader(headers, ['date', 'transactiondate', 'posteddate'])),
        merchant: Math.max(0, findHeader(headers, ['merchant', 'description', 'name', 'payee', 'transactiondescription'])),
        amount: Math.max(0, findHeader(headers, ['amount', 'cadamount', 'transactionamount'])) });
      setCsvRows(rows); setShowImport(true);
    } catch (e) { notify(e instanceof Error ? e.message : 'Could not read CSV', true); }
  }
  async function importCsv() {
    if (!csvRows.length) return;
    const accepted: Transaction[] = [];
    let skipped = 0;
    for (const [i, row] of csvRows.slice(1, 501).entries()) {
      const date = parseDate(row[csvMap.date] ?? '');
      const merchant = (row[csvMap.merchant] ?? '').trim();
      const signed = parseCsvCents(row[csvMap.amount] ?? '');
      if (!date || !merchant || signed === null || !signed || (signConvention === 'positive' && signed < 0) || (signConvention === 'negative' && signed > 0)) { skipped++; continue; }
      const amt = Math.abs(signed);
      const duplicate = txs.some(t => t.source === 'csv' && t.merchant === merchant && t.amount_cents === amt && t.occurred_at.slice(0,10) === date.toISOString().slice(0,10));
      if (duplicate) { skipped++; continue; }
      accepted.push({ id: crypto.randomUUID(), merchant: merchant.slice(0,160), amount_cents: amt, category: categorize(merchant, rules),
        occurred_at: date.toISOString(), currency: 'CAD', source: 'csv', status: 'confirmed', notes: null,
        external_id: `csv:${date.toISOString().slice(0,10)}:${merchantKey(merchant)}:${amt}:${i}` });
    }
    if (!accepted.length) return notify(`Nothing imported; ${skipped} skipped. Check column mapping, date format, and amount sign.`, true);
    if (connected && supabase && session) {
      const { data, error } = await supabase.from('transactions').insert(accepted.map(t => ({ ...t, user_id: session.user.id }))).select();
      if (error) return notify(error.message, true);
      setTxs(old => [...(data as Transaction[]), ...old]);
    } else setTxs(old => [...accepted, ...old]);
    setShowImport(false); setCsvRows([]);
    notify(`Imported ${accepted.length} purchases; ${skipped} rows skipped. Verify against your statement.`);
  }
  const monthOptions = useMemo(() => {
    const all = new Set([monthKey(new Date()), month, ...txs.map(t => monthKey(t.occurred_at))]);
    return [...all].sort().reverse();
  }, [txs, month]);

  if (!ready || authLoading) return <div className="splash"><div className="brand-mark"><Activity size={28} /></div><h1>Spendwise</h1><p>Preparing your workspace…</p></div>;
  if (connected && !session) return <div className="auth-shell"><div className="auth-card">
    <div className="brand-mark large"><Activity /></div><p className="eyebrow">YOUR PRIVATE MONEY WORKSPACE</p>
    <h1>Know where your money goes.</h1><p className="muted">Sign in with a secure email link. Your transactions are private to your account.</p>
    <form onSubmit={login} className="stack gap-md"><label className="field-label" htmlFor="login-email">Email</label><input required id="login-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /><button className="btn primary full" disabled={busy} type="submit">{busy ? 'Sending…' : 'Send sign-in link'} <ArrowRight size={17} /></button></form>
    {banner && <p className={`alert ${banner.error ? 'error' : ''}`}>{banner.text}</p>}
    <div className="auth-foot"><LockKeyhole size={15} /> Supabase email authentication · CAD only</div>
  </div></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={21}/></div><span>spendwise<span className="brand-dot">.</span></span></div>
      <div className="workspace"><div className="workspace-icon">G</div><div><b>Personal workspace</b><small>{connected ? 'Private account' : 'Demo environment'}</small></div><ChevronDown size={15} /></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{tabs.map(t => <button key={t.key} onClick={() => { setTab(t.key); setMenuOpen(false); }} className={`nav-item ${tab === t.key ? 'selected' : ''}`}><t.icon size={18} strokeWidth={2}/>{t.label}{t.key === 'transactions' && pendingCount > 0 && <span className="mini-count">{pendingCount}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="side-tip"><div className="tip-icon"><Sparkles size={17}/></div><b>Better spending habits</b><p>See patterns, set budgets, and make informed decisions.</p></div><div className="side-version">Spendwise MVP · v0.1</div></div>
    </aside>
    {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)}/>}
    <div className="main-shell">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={21}/></button><span className="breadcrumb">Workspace</span><span className="divider-v">/</span><b>{tabs.find(t => t.key === tab)?.label}</b></div><div className="topbar-right"><span className="currency-chip">🇨🇦 CAD</span><span className="avatar">G</span></div></header>
      <main className="content">
        {banner && <div role="status" className={`notice ${banner.error ? 'notice-error' : ''}`}><span>{banner.text}</span><button aria-label="Dismiss notice" onClick={() => setBanner(null)}><X size={16}/></button></div>}
        {!connected && <div className="demo-banner"><div><Sparkles size={16}/><b>Demo mode</b><span>You're exploring with sample transactions. Changes are saved only in this browser, not to a database.</span></div><button onClick={() => setTab('settings')}>Connect Supabase <ArrowRight size={15}/></button></div>}
        {tab !== 'settings' && <div className="page-heading"><div><div className="eyebrow">YOUR MONEY, IN FOCUS</div><h1>{tab === 'overview' ? 'Overview' : tab === 'transactions' ? 'Transactions' : 'Monthly report'}</h1><p>{tab === 'overview' ? 'A clearer picture of your spending, every day.' : tab === 'transactions' ? 'Every purchase in one place. Review, search and recategorize.' : 'Your spending story, beautifully summarized.'}</p></div><div className="heading-actions"><select aria-label="Select reporting month" className="select month-select" value={month} onChange={e => setMonth(e.target.value)}>{monthOptions.map(m => <option value={m} key={m}>{monthLabel(m)}</option>)}</select><button className="btn primary" onClick={() => setShowAdd(true)}><Plus size={16}/> Add expense</button></div></div>}

        {tab === 'overview' && <>
          <section className="metric-grid"><div className="metric-card featured"><div className="metric-label">TOTAL SPENDING <span className="metric-icon"><Wallet size={19}/></span></div><div className="metric-number">{money(total)}</div><div className="metric-foot">{delta === null ? 'No comparison data last month' : <><span className={`delta ${delta > 0 ? 'up' : 'down'}`}>{delta > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {Math.abs(delta)}%</span> from previous month</>}</div></div>
            <div className="metric-card"><div className="metric-label">MONTHLY BUDGET <span className="metric-icon pale-purple"><CalendarDays size={19}/></span></div><div className="metric-number">{money(budgetCents)}</div><div className="budget-progress"><span style={{ width: `${Math.min(100, total / budgetCents * 100)}%`, background: over ? '#e56e7b' : undefined }}/></div><div className="metric-foot">{over ? `${money(-remaining)} over budget` : `${money(remaining)} remaining`}</div></div>
            <div className="metric-card"><div className="metric-label">TRANSACTIONS <span className="metric-icon pale-mint"><CreditCard size={19}/></span></div><div className="metric-number">{currentTxs.length}<span className="light-unit"> purchases</span></div><div className="metric-foot">Avg. {money(currentTxs.length ? Math.round(total / currentTxs.length) : 0)} per purchase</div></div>
          </section>
          <section className="dashboard-grid"><div className="panel categories-panel"><div className="panel-head"><div><h2>Spending breakdown</h2><p>Where your money went this month</p></div><span className="tiny-chip">By category</span></div>{categorySpend.length ? <div className="donut-layout"><div className="donut-graph"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categorySpend} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="91%" paddingAngle={3} stroke="none">{categorySpend.map((_,i)=><Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={(v) => money(Number(v))} /></PieChart></ResponsiveContainer><div className="donut-center"><small>Total spent</small><b>{money(total)}</b></div></div><div className="category-legend">{categorySpend.map((d,i)=><div className="legend-item" key={d.name}><span className="legend-dot" style={{ background: PIE_COLORS[i%PIE_COLORS.length] }} /><span>{d.name}</span><b>{Math.round(d.value / (total || 1) * 100)}%</b></div>)}</div></div> : <EmptyState text="No spending in this month yet."/>}</div>
            <div className="panel trend-panel"><div className="panel-head"><div><h2>Spending trends</h2><p>Six-month snapshot</p></div><span className="tiny-chip">Monthly</span></div><div className="trend-graph"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top: 18,right: 5,left:-12,bottom:0}}><defs><linearGradient id="spendGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7c68e7" stopOpacity={0.2}/><stop offset="98%" stopColor="#7c68e7" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#edf0f5" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#8f97aa'}} dy={8}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#8f97aa'}} tickFormatter={v=>`$${v}`}/><Tooltip formatter={(v)=>money(Math.round(Number(v)*100))}/><Area dataKey="amount" name="Spending" type="monotone" stroke="#7564e8" strokeWidth={3} fill="url(#spendGradient)"/></AreaChart></ResponsiveContainer></div></div></section>
          <section className="dashboard-grid lower-grid"><div className="panel transactions-panel"><div className="panel-head"><div><h2>Recent activity</h2><p>Your latest transactions</p></div><button className="text-link" onClick={() => setTab('transactions')}>View all <ArrowRight size={15}/></button></div>{currentTxs.length ? currentTxs.slice().sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)).slice(0,5).map(t => <TransactionItem key={t.id} tx={t} />) : <EmptyState text="No expenses to show."/>}</div>
            <div className="panel merchants-panel"><div className="panel-head"><div><h2>Top merchants</h2><p>Your most frequent spending destinations</p></div><MoreHorizontal size={20} color="#96a0b1"/></div>{merchants.length ? merchants.slice(0,5).map((m,i) => <div className="merchant-row" key={m.name}><span className="merchant-rank">{String(i+1).padStart(2,'0')}</span><span className="merchant-name">{m.name}</span><b>{money(m.cents)}</b></div>) : <EmptyState text="Merchant ranking will appear here."/>}</div></section>
        </>}

        {tab === 'transactions' && <div className="panel ledger"><div className="ledger-head"><div><h2>All transactions <span className="count-badge">{visibleTxs.length}</span></h2><p>Amounts are shown in CAD. Pending transactions should be reconciled against TD.</p></div><div className="ledger-actions"><label className="btn outline file-label"><FileUp size={16}/> Import CSV<input type="file" accept=".csv,text/csv" onChange={e => { const f = e.target.files?.[0]; if(f) void selectFile(f); e.target.value = ''; }} /></label><button className="btn outline" onClick={() => saveFile(exportCsv(visibleTxs), `spendwise-${month}.csv`)}><Download size={16}/> Export</button></div></div>
          <div className="filters"><div className="searchbox"><Search size={17}/><input placeholder="Search merchants or categories" value={search} onChange={e=>setSearch(e.target.value)} /></div><select className="select" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>All categories</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><select className="select" value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option>All sources</option><option value="apple_pay">Apple Pay</option><option value="manual">Manual</option><option value="csv">CSV</option></select></div>
          <div className="table-wrap"><table className="transactions-table"><thead><tr><th>MERCHANT</th><th>DATE</th><th>CATEGORY</th><th>SOURCE</th><th>STATUS</th><th>AMOUNT</th><th>ACTIONS</th></tr></thead><tbody>{visibleTxs.map(t=><tr key={t.id}><td><div className="td-merchant"><span className="category-icon"><IconForCategory category={t.category}/></span><b>{t.merchant}</b></div></td><td>{labelDate(t.occurred_at)}</td><td><select aria-label={`Category for ${t.merchant}`} disabled={busy} className="category-select" value={t.category} onChange={e=>void changeCategory(t, e.target.value as Category)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></td><td><span className="source-pill">{t.source==='apple_pay'?' Pay':t.source==='csv'?'CSV import':'Manual'}</span></td><td>{t.status==='pending'?<span className="status-pill pending">Pending</span>:<span className="status-pill confirmed">Confirmed</span>}</td><td className="amount-cell">−{money(t.amount_cents)}</td><td><div className="td-actions">{t.status==='pending' && <button title="Mark confirmed" aria-label={`Confirm ${t.merchant}`} onClick={()=>void markConfirmed(t)}><Check size={16}/></button>}<button title="Delete transaction" aria-label={`Delete ${t.merchant}`} onClick={()=>void deleteTransaction(t)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!visibleTxs.length && <EmptyState text="No matching transactions. Try another month or add an expense."/>}</div>
        </div>}

        {tab === 'report' && <><div className="report-intro"><div className="report-icon"><FileChartColumn size={26}/></div><div><div className="eyebrow">MONTH-END INSIGHTS</div><h2>Your {monthLabel(month)} report</h2><p>Generated instantly from all recorded CAD transactions in the selected month.</p></div><button className="btn primary print-btn" onClick={()=>window.print()}><FileDown size={16}/> Save as PDF</button></div>
          <div className="report-sheet"><div className="report-sheet-head"><div><div className="eyebrow">SPENDWISE / MONTHLY REPORT</div><h2>{monthLabel(month)}</h2><p>Personal spending summary · CAD</p></div><span className="sheet-mark"><Activity size={25}/></span></div>
            <div className="report-kpis"><div><small>Total spend</small><b>{money(total)}</b></div><div><small>Purchases</small><b>{currentTxs.length}</b></div><div><small>Average purchase</small><b>{money(currentTxs.length?Math.round(total/currentTxs.length):0)}</b></div><div><small>Budget remaining</small><b className={over?'negative':''}>{money(remaining)}</b></div></div>
            <h3>Spending by category</h3><div className="report-bars">{categorySpend.length ? categorySpend.map((c,i) => <div className="report-bar" key={c.name}><div className="report-bar-label"><span>{c.name}</span><b>{money(c.value)} <small>({Math.round(100*c.value/(total||1))}%)</small></b></div><div className="track"><span style={{width:`${Math.max(1,100*c.value/(total||1))}%`,background:PIE_COLORS[i%PIE_COLORS.length]}}/></div></div>) : <p className="muted">No transactions yet.</p>}</div>
            <div className="report-columns"><div><h3>Top merchants</h3>{merchants.slice(0,5).map((m,i) => <div key={m.name} className="report-line"><span>{i+1}. {m.name}</span><b>{money(m.cents)}</b></div>)}{!merchants.length&&<p className="muted">No merchants yet.</p>}</div><div><h3>Highlights</h3><ul className="insight-list"><li>{categorySpend[0] ? `Your largest spending category was ${categorySpend[0].name} (${Math.round(categorySpend[0].value/(total||1)*100)}%).` : 'Add spending to see your patterns.'}</li><li>{delta===null?'No previous month data for comparison.':`Total spending was ${Math.abs(delta)}% ${delta>0?'higher':delta<0?'lower':'unchanged'} compared with the previous month.`}</li><li>{over ? `You exceeded the monthly budget by ${money(-remaining)}.` : `${money(remaining)} remains in your monthly budget.`}</li><li>{pendingCount} transaction(s) still need statement review.</li></ul></div></div>
            <p className="report-disclaimer">Transactions imported from Wallet may reflect authorizations rather than final bank-posted amounts. Compare with your TD statement. This report is for personal budgeting, not official financial or tax reporting.</p></div>
        </>}

        {tab === 'settings' && <><div className="page-heading"><div><div className="eyebrow">MAKE SPENDWISE YOURS</div><h1>Settings & setup</h1><p>Configure your budget and connect your Apple Pay automation.</p></div>{connected&&<button className="btn outline" onClick={()=>void supabase?.auth.signOut()}><LogOut size={17}/> Sign out</button>}</div>
          <div className="settings-grid"><div className="panel settings-card"><div className="panel-head"><div><h2>Monthly budget</h2><p>Set a spending target for {monthLabel(month)}.</p></div><Wallet size={22} color="#826be6"/></div><form className="budget-form" onSubmit={setBudget}><label htmlFor="budget">Budget (CAD)</label><div className="budget-form-row"><div className="currency-input"><span>$</span><input id="budget" inputMode="decimal" value={budgetInput} onChange={e=>setBudgetInput(e.target.value)}/></div><button className="btn primary" type="submit">Save budget</button></div></form><small className="muted">Budgets are stored per month. In demo mode, they stay in this browser.</small></div>
            <div className="panel settings-card"><div className="panel-head"><div><h2>Data & privacy</h2><p>Where your spending data lives</p></div><ShieldCheck size={22} color="#2bb5a0"/></div><div className="setting-line"><span>Storage</span><b>{connected?'Supabase PostgreSQL':'Browser localStorage (demo)'}</b></div><div className="setting-line"><span>Login</span><b>{connected?'Email magic link':'Not required in demo'}</b></div><div className="setting-line"><span>Currency</span><b>CAD only (MVP)</b></div><div className="setting-line"><span>Bank credentials stored</span><b>No</b></div>{!connected&&<button className="btn outline" onClick={()=>{ if(window.confirm('Reset demo data and rules?')) {localStorage.removeItem('spendwise-demo-v1');setTxs(demoTransactions());setRules({});setBudgets([]);} }}>Reset demo data</button>}</div></div>
          <div className="panel setup-panel"><div className="panel-head"><div><h2>Connect Apple Wallet</h2><p>From iPhone payments to your private dashboard</p></div><span className="tiny-chip">Phase 2</span></div><div className="setup-steps"><div><span>01</span><p>Deploy Spendwise to an HTTPS address, configure Supabase and set your private ingestion key.</p></div><div><span>02</span><p>iPhone Shortcuts → Automation → Transaction / Wallet → choose TD Credit Card → Run Immediately.</p></div><div><span>03</span><p>Add <b>Get Contents of URL</b> with POST to <code>https://YOUR-APP.vercel.app/api/ingest</code>. Set header <code>X-Spendwise-Key</code> to your private key.</p></div><div><span>04</span><p>Use JSON request body with fields <code>merchant</code> = Shortcut Input → Merchant, <code>amount</code> = Shortcut Input → Amount, <code>currency</code> = CAD. Then test with your next normal in-store Apple Pay purchase.</p></div></div><div className="code-sample"><pre>{'{\n  "merchant": "Tim Hortons",\n  "amount": "8.50",\n  "currency": "CAD"\n}'}</pre><button className="btn outline" onClick={()=>void navigator.clipboard.writeText('{"merchant":"Tim Hortons","amount":"8.50","currency":"CAD"}').then(()=>notify('Example JSON copied.'))}>Copy sample JSON</button></div><p className="hint"><CircleHelp size={16}/> Do not put your TD password, card number or CVV in the Shortcut. Keep the ingest key private.</p></div>
          <div className="panel settings-card"><div className="panel-head"><div><h2>Import bank statements</h2><p>Fill gaps from online payments or physical-card purchases.</p></div><FileUp size={21}/></div><p className="muted">Export a CSV from TD EasyWeb, then choose which columns contain date, merchant and amount. Only CAD purchase rows are imported; make sure to choose whether purchases appear as positive or negative amounts.</p><label className="btn outline file-label"><FileUp size={16}/> Choose CSV file<input type="file" accept=".csv,text/csv" onChange={e=>{const f=e.target.files?.[0];if(f)void selectFile(f);e.target.value='';}}/></label></div>
        </>}
      </main>
    </div>

    {showAdd && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Add expense"><div className="modal-head"><div><div className="eyebrow">NEW TRANSACTION</div><h2>Add an expense</h2></div><button className="icon-btn" aria-label="Close" onClick={()=>setShowAdd(false)}><X size={20}/></button></div><form onSubmit={addTransaction} className="modal-form"><label>Merchant<input required maxLength={160} placeholder="e.g. Tim Hortons" value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})}/></label><div className="two-cols"><label>Amount (CAD)<input required type="number" min="0.01" max="1000000" step="0.01" placeholder="8.50" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Date<input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label></div><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value as Category | 'Auto'})}><option>Auto</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Notes (optional)<textarea rows={3} placeholder="Details you want to remember" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button disabled={busy} className="btn primary full" type="submit">{busy?'Saving…':'Save expense'} <ArrowRight size={16}/></button></form></div></div>}

    {showImport && csvRows.length>0 && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowImport(false)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Import CSV"><div className="modal-head"><div><div className="eyebrow">IMPORT FROM TD OR ANOTHER CSV</div><h2>Match your CSV columns</h2></div><button className="icon-btn" onClick={()=>setShowImport(false)} aria-label="Close"><X size={20}/></button></div><div className="modal-form"><p className="muted">Preview: {csvRows.length-1} data rows. Supports YYYY-MM-DD or MM/DD/YYYY dates. Maximum 500 rows per import. Select the columns below.</p>{(['date','merchant','amount'] as const).map(field => <label key={field}>{field[0].toUpperCase()+field.slice(1)} column<select value={csvMap[field]} onChange={e=>setCsvMap({...csvMap,[field]:Number(e.target.value)})}>{csvRows[0].map((h,i)=><option key={i} value={i}>{h || `Column ${i+1}`}</option>)}</select></label>)}<label>How are purchases represented?<select value={signConvention} onChange={e=>setSignConvention(e.target.value as 'positive' | 'negative')}><option value="positive">Positive numbers = purchases</option><option value="negative">Negative numbers = purchases</option></select></label><div className="csv-preview">{csvRows.slice(1,4).map((r,i)=><div key={i}>{r[csvMap.date]} · {r[csvMap.merchant]} · {r[csvMap.amount]}</div>)}</div><p className="hint"><CircleHelp size={16}/> Check sign direction carefully. Opposite-sign rows are skipped (typically refunds/payments). Do not import non-CAD amounts.</p><button className="btn primary full" onClick={()=>void importCsv()}><FileUp size={16}/> Import purchases</button></div></div></div>}
  </div>;
}
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><CreditCard size={25}/><p>{text}</p></div>; }
function TransactionItem({tx}: {tx: Transaction}) { return <div className="activity-row"><span className="activity-icon"><IconForCategory category={tx.category}/></span><div className="activity-info"><b>{tx.merchant}</b><small>{tx.category} · {labelDate(tx.occurred_at)}</small></div><strong>−{money(tx.amount_cents)}</strong></div>; }
