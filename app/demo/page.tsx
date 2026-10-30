import Dashboard from '@/components/Dashboard';

export const metadata = {
  title: 'Spendwise | Interactive Demo',
  description: 'Try a personal finance dashboard with fictional expenses. No account required.',
};

export default function DemoPage() {
  return <Dashboard demoMode />;
}
