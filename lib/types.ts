export const CATEGORIES = ['Food & Drinks', 'Groceries', 'Shopping', 'Transport', 'Subscriptions', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'] as const;
export type Category = typeof CATEGORIES[number];
export type TxSource = 'apple_pay' | 'manual' | 'csv';
export type TxStatus = 'pending' | 'confirmed';
export interface Transaction {
  id: string;
  user_id?: string;
  merchant: string;
  amount_cents: number;
  currency: string;
  category: Category;
  occurred_at: string;
  source: TxSource;
  status: TxStatus;
  notes?: string | null;
  external_id?: string | null;
}
export type MerchantRules = Record<string, Category>;
export interface Budget { month: string; amount_cents: number; }
