import { useState } from 'react';
import { Zap, Github, Key } from 'lucide-react';
import { getUsageSummary } from '@/services/tokenTracker';
import { APIKeyModal, getStoredAPIKey } from '@/components/ui';
import type { TokenStats } from '@/types';

interface HeaderProps {
  onAPIKeyChange?: (key: string) => void;
  tokenStats?: TokenStats;
}

export function Header({ onAPIKeyChange, tokenStats }: HeaderProps) {
  const hasUsage = tokenStats && tokenStats.requestCount > 0;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentKey, setCurrentKey] = useState<string | undefined>(getStoredAPIKey() || undefined);

  const handleSaveKey = (key: string) => {
    setCurrentKey(key || undefined);
    onAPIKeyChange?.(key);
  };

  const hasKey = !!currentKey || !!import.meta.env.VITE_OPENAI_API_KEY;

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-surface-100 tracking-tight">
              Solva
            </h1>
            <p className="text-xs text-surface-500 -mt-0.5">AI UI Generator</p>
          </div>
        </div>

        {/* Center - Token Stats */}
        {hasUsage && tokenStats && (
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface-900/50 rounded-lg border border-surface-800">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-surface-300">
              {getUsageSummary(tokenStats)}
            </span>
          </div>
        )}

        {/* Right - API Key & Links */}
        <div className="flex items-center gap-2">
          {/* API Key Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200
              ${hasKey 
                ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20' 
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse-subtle'
              }
            `}
          >
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">
              {hasKey ? 'API Key' : 'Add API Key'}
            </span>
          </button>

          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-surface-400 hover:text-surface-200 transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </header>

      {/* API Key Modal */}
      <APIKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveKey}
        currentKey={currentKey}
      />
    </>
  );
}
