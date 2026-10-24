import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Spendwise | Personal spending, made clear',
  description: 'Private spending dashboard with Apple Pay Shortcuts ingestion, categories and monthly reports.'
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
