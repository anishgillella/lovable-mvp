import { ReactNode } from 'react';
import { Header } from './Header';
import type { TokenStats } from '@/types';

interface MainLayoutProps {
  children: ReactNode;
  onAPIKeyChange?: (key: string) => void;
  tokenStats?: TokenStats;
}

export function MainLayout({ children, onAPIKeyChange, tokenStats }: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      <Header onAPIKeyChange={onAPIKeyChange} tokenStats={tokenStats} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
