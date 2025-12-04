import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { GeneratedCode } from '@/types';

interface CodeViewProps {
  code: GeneratedCode | null;
}

type TabType = 'html' | 'css' | 'js';

export function CodeView({ code }: CodeViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('html');
  const [copied, setCopied] = useState(false);

  const tabs: { id: TabType; label: string; content: string }[] = [
    { id: 'html', label: 'HTML', content: code?.html || '' },
    { id: 'css', label: 'CSS', content: code?.css || '' },
    { id: 'js', label: 'JavaScript', content: code?.js || '' },
  ];

  const activeContent = tabs.find((t) => t.id === activeTab)?.content || '';

  const handleCopy = async () => {
    if (!activeContent) return;
    
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!code) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-900">
        <p className="text-surface-500 text-sm">No code generated yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-900">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-surface-800 px-2">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2.5 text-sm font-medium transition-colors relative
                ${activeTab === tab.id 
                  ? 'text-primary-400' 
                  : 'text-surface-400 hover:text-surface-200'
                }
              `}
            >
              {tab.label}
              {tab.content && (
                <span className="ml-1.5 text-xs text-surface-500">
                  ({tab.content.split('\n').length})
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
              )}
            </button>
          ))}
        </div>
        
        {/* Copy button */}
        <button
          onClick={handleCopy}
          disabled={!activeContent}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-surface-400 hover:text-surface-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        {activeContent ? (
          <pre className="p-4 text-sm font-mono text-surface-300 whitespace-pre-wrap break-all">
            <code>{activeContent}</code>
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-500 text-sm">
              No {activeTab.toUpperCase()} content
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


