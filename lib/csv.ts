export function parseCSV(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) { row.push(field); field = ''; }
    else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(x => x.trim())) rows.push(row);
      row = []; field = '';
    } else field += ch;
  }
  if (inQuotes) throw new Error('Unclosed quote in CSV');
  row.push(field); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
export function parseDate(raw: string): Date | null {
  const value = raw.trim();
  let year: number, month: number, day: number;
  let m = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) { [, year, month, day] = m.map(Number); }
  else {
    m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    month = Number(m[1]); day = Number(m[2]); year = Number(m[3]);
  }
  const date = new Date(year!, month! - 1, day!, 12);
  return date.getFullYear() === year! && date.getMonth() === month! - 1 && date.getDate() === day! ? date : null;
}
export function parseCsvCents(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(/^\(?\$?/, '').replace(/\)?$/, '').replace(/,/g, '');
  // Parenthesized values (accounting export) represent negative numbers.
  const neg = /^\(.*\)$/.test(raw.trim()) || cleaned.startsWith('-');
  const normalized = cleaned.replace(/^-/, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [a, b = ''] = normalized.split('.');
  const n = Number(a) * 100 + Number(b.padEnd(2, '0'));
  return Number.isSafeInteger(n) && n <= 100000000 ? (neg ? -n : n) : null;
}
export function findHeader(headers: string[], candidates: string[]): number {
  return headers.findIndex(h => candidates.some(c => h.toLowerCase().trim().replace(/[^a-z]/g, '') === c));
}
