import { useState } from 'react';
import { Monitor, Code2, Maximize2, Minimize2 } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { PreviewFrame } from './PreviewFrame';
import { PreviewError } from './PreviewError';
import { CodeView } from './CodeView';

interface PreviewPanelProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function PreviewPanel({ isExpanded, onToggleExpand }: PreviewPanelProps) {
  const { currentCode, error } = useChat();
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePreviewError = (errorMsg: string) => {
    setPreviewError(errorMsg);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-800">
        <div className="flex items-center gap-2">
          {viewMode === 'preview' ? (
            <Monitor className="w-5 h-5 text-primary-400" />
          ) : (
            <Code2 className="w-5 h-5 text-primary-400" />
          )}
          <h2 className="font-semibold text-surface-100">
            {viewMode === 'preview' ? 'Preview' : 'Code'}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-surface-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('preview')}
              className={`
                px-3 py-1.5 text-sm rounded-md transition-colors
                ${viewMode === 'preview' 
                  ? 'bg-surface-700 text-surface-100' 
                  : 'text-surface-400 hover:text-surface-200'
                }
              `}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`
                px-3 py-1.5 text-sm rounded-md transition-colors
                ${viewMode === 'code' 
                  ? 'bg-surface-700 text-surface-100' 
                  : 'text-surface-400 hover:text-surface-200'
                }
              `}
            >
              <Code2 className="w-4 h-4" />
            </button>
          </div>
          
          {/* Expand toggle */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-2 text-surface-400 hover:text-surface-200 transition-colors"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {previewError || error ? (
          <PreviewError 
            error={previewError || error || 'Unknown error'} 
            onRetry={() => setPreviewError(null)}
          />
        ) : viewMode === 'preview' ? (
          <PreviewFrame code={currentCode} onError={handlePreviewError} />
        ) : (
          <CodeView code={currentCode} />
        )}
      </div>
    </div>
  );
}


