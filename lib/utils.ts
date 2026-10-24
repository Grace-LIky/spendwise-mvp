import type { Transaction } from './types';
export const money = (cents: number, currency = 'CAD') => new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(cents / 100);
export const monthKey = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  // Date in the user's local timezone (browser). Report is local calendar month.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
export const monthLabel = (month: string) => {
  const [year, mm] = month.split('-').map(Number);
  return new Date(year, mm - 1, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
};
export const previousMonth = (month: string) => {
  const [year, mm] = month.split('-').map(Number);
  return monthKey(new Date(year, mm - 2, 1));
};
export const sumSpent = (txs: Transaction[]) => txs.reduce((sum, t) => sum + t.amount_cents, 0);
export const demoTransactions = (): Transaction[] => {
  const now = new Date();
  const merchantAmounts: [string, number][] = [
    ['Tim Hortons', 8.5], ['Loblaws', 42.35], ['Aritzia', 86], ['Starbucks', 6.8],
    ['TTC PRESTO', 3.3], ['Metro', 64.28], ['Uniqlo', 48.9], ['Crumbl Cookies', 19.5],
    ['Netflix', 16.99], ['Shoppers Drug Mart', 24.25], ['Uber Eats', 26.78],
    ['Loblaws', 55.78], ['Coffee Shop', 7.25], ['Cineplex', 21.5], ['TTC PRESTO', 3.3],
    ['Aritzia', 125], ['Tim Hortons', 11.2], ['Loblaws', 38.9]
  ];
  // Deterministic demo data across 3 months; never representing the user's real charges.
  const output: Transaction[] = [];
  for (let m = 0; m < 3; m++) {
    for (let i = 0; i < merchantAmounts.length; i++) {
      const [merchant, base] = merchantAmounts[i];
      const d = new Date(now.getFullYear(), now.getMonth() - m, Math.min(1 + i, now.getDate() || 1), 12, 0);
      if (d > now) continue;
      const amount = Math.round((base + m * 2.1 + (i % 3) * 0.4) * 100);
      output.push({ id: `demo-${m}-${i}`, merchant, amount_cents: amount, currency: 'CAD',
        category: requireCategorize(merchant), occurred_at: d.toISOString(), source: i % 5 === 0 ? 'manual' : 'apple_pay', status: i % 7 === 0 ? 'pending' : 'confirmed' });
    }
  }
  return output.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
};
import { categorize as requireCategorize } from './categorize';
export function csvEscape(value: string | number) { const s = String(value); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
export function exportCsv(txs: Transaction[]) {
  return ['date,merchant,amount,currency,category,source,status,notes', ...txs.map(t => [t.occurred_at, t.merchant, (t.amount_cents / 100).toFixed(2), t.currency, t.category, t.source, t.status, t.notes ?? ''].map(csvEscape).join(','))].join('\n');
}
