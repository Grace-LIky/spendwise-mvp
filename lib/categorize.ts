import { CATEGORIES, type Category, type MerchantRules } from './types';
export const merchantKey = (merchant: string) => merchant.trim().toLowerCase().replace(/[^a-z0-9\p{L}]+/gu, ' ').replace(/\s+/g, ' ').trim();
const RULES: { category: Category; patterns: RegExp[] }[] = [
  { category: 'Groceries', patterns: [/loblaws/i, /no frills/i, /metro\b/i, /freshco/i, /sobeys/i, /t&t/i, /walmart supercentre/i, /food basics/i, /costco/i] },
  { category: 'Food & Drinks', patterns: [/tim hortons/i, /starbucks/i, /coffee/i, /restaurant/i, /cafe/i, /mcdonald/i, /chipotle/i, /uber eats/i, /doordash/i, /bubble tea/i, /gong cha/i, /chatime/i, /pizz/i, /crumbl/i] },
  { category: 'Transport', patterns: [/\bttc\b/i, /presto/i, /uber trip/i, /\blyft\b/i, /viarail/i, /go transit/i, /parking/i] },
  { category: 'Shopping', patterns: [/aritzia/i, /uniqlo/i, /sephora/i, /zara/i, /amazon/i, /winners/i, /ikea/i, /indigo/i, /h&m/i] },
  { category: 'Subscriptions', patterns: [/netflix/i, /spotify/i, /apple\.com\/bill/i, /icloud/i, /youtube premium/i, /adobe/i] },
  { category: 'Education', patterns: [/university of toronto/i, /uoft/i, /coursera/i, /udemy/i] },
  { category: 'Health', patterns: [/shoppers drug mart/i, /pharmacy/i, /dental/i, /clinic/i] },
  { category: 'Bills', patterns: [/rogers/i, /bell canada/i, /fido/i, /hydro/i, /internet/i, /insurance/i] },
  { category: 'Entertainment', patterns: [/cineplex/i, /movie/i, /theatre/i, /ticketmaster/i, /museum/i] },
];
export function categorize(merchant: string, overrides: MerchantRules = {}): Category {
  const key = merchantKey(merchant);
  if (overrides[key] && CATEGORIES.includes(overrides[key])) return overrides[key];
  return RULES.find(r => r.patterns.some(p => p.test(merchant)))?.category ?? 'Other';
}
