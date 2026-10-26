import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { categorize, merchantKey } from '@/lib/categorize';
import { CATEGORIES } from '@/lib/types';

export const runtime = 'nodejs';
function sameSecret(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}
function centsOf(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const str = String(value).trim().replace(/^(?:CAD\s*|CA\$\s*|[$¥€£]\s*)/i, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(str)) return null;
  const [dollars, fraction = ''] = str.split('.');
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100000000 ? cents : null;
}

export async function POST(request: Request) {
  const secret = process.env.SHORTCUT_INGEST_KEY;
  const userId = process.env.SHORTCUT_USER_ID;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !userId || !supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Ingestion not configured' }, { status: 503 });

  const provided = request.headers.get('x-spendwise-key') ?? '';
  if (!sameSecret(provided, secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
    body = parsed as Record<string, unknown>;
  } catch { return NextResponse.json({ error: 'Expected JSON request body' }, { status: 400 }); }

  const merchant = typeof body.merchant === 'string' ? body.merchant.trim().slice(0, 160) : '';
  const amount_cents = centsOf(body.amount);
  const currency = body.currency === undefined ? 'CAD' : String(body.currency).toUpperCase();
  const external_id = typeof body.external_id === 'string' && body.external_id.trim() ? body.external_id.trim().slice(0, 200) : null;
  const occurred_at = typeof body.occurred_at === 'string' ? new Date(body.occurred_at) : new Date();
  if (!merchant || !amount_cents || currency !== 'CAD' || Number.isNaN(occurred_at.getTime())) {
    return NextResponse.json({ error: 'Required: merchant and positive CAD amount (currency must be CAD); optional occurred_at and external_id' }, { status: 400 });
  }
  if (Math.abs(Date.now() - occurred_at.getTime()) > 1000 * 60 * 60 * 24 * 30) {
    return NextResponse.json({ error: 'Timestamp must be within 30 days of receipt' }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const key = merchantKey(merchant);
  // If user manually corrected this merchant before, use that rule for future transactions.
  const { data: override, error: overrideErr } = await admin.from('merchant_rules').select('category').eq('user_id', userId).eq('merchant_key', key).maybeSingle();
  if (overrideErr) return NextResponse.json({ error: 'Failed to fetch merchant rule' }, { status: 500 });
  const preferred = override && CATEGORIES.includes(override.category) ? override.category : null;
  const category = preferred ?? categorize(merchant);

  if (external_id) {
    const { data: found, error } = await admin.from('transactions').select('id').eq('user_id', userId).eq('external_id', external_id).maybeSingle();
    if (error) return NextResponse.json({ error: 'Deduplication check failed' }, { status: 500 });
    if (found) return NextResponse.json({ ok: true, duplicate: true, id: found.id });
  } else {
    // Best-effort duplicate avoidance on back-to-back replay. Identical real payments
    // within 90 seconds may be considered duplicates. Use external_id for strong dedup.
    const { data: nearby, error } = await admin.from('transactions').select('id,merchant,amount_cents,currency')
      .eq('user_id', userId).eq('source', 'apple_pay')
      .gte('occurred_at', new Date(occurred_at.getTime() - 90000).toISOString())
      .lte('occurred_at', new Date(occurred_at.getTime() + 90000).toISOString())
      .limit(20);
    if (error) return NextResponse.json({ error: 'Deduplication check failed' }, { status: 500 });
    const same = nearby?.find(x => merchantKey(x.merchant) === key && x.amount_cents === amount_cents && x.currency === currency);
    if (same) return NextResponse.json({ ok: true, duplicate: true, id: same.id });
  }

  const { data, error } = await admin.from('transactions').insert({ user_id: userId, merchant, amount_cents, currency, category,
    source: 'apple_pay', status: 'pending', occurred_at: occurred_at.toISOString(), external_id }).select('id').single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id, category, status: 'pending' }, { status: 201 });
}
