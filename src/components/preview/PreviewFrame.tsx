import { useEffect, useState, useMemo } from 'react';
import type { GeneratedCode } from '@/types';
import { logger, LOG_CATEGORIES } from '@/utils/logger';

interface PreviewFrameProps {
  code: GeneratedCode | null;
  onError?: (error: string) => void;
}

export function PreviewFrame({ code, onError }: PreviewFrameProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the combined HTML to prevent unnecessary re-renders
  const srcDoc = useMemo(() => {
    if (!code?.combined) {
      logger.debug(LOG_CATEGORIES.PREVIEW, 'No combined code available');
      return null;
    }
    
    logger.info(LOG_CATEGORIES.PREVIEW, 'Preparing srcDoc', {
      htmlLength: code.html.length,
      cssLength: code.css.length,
      jsLength: code.js.length,
      combinedLength: code.combined.length,
    });
    
    return code.combined;
  }, [code?.combined, code?.html.length, code?.css.length, code?.js.length]);

  // Force iframe refresh when code changes
  useEffect(() => {
    if (srcDoc) {
      logger.info(LOG_CATEGORIES.PREVIEW, 'Code changed, refreshing iframe');
      setIsLoading(true);
      setIframeKey(k => k + 1);
    }
  }, [srcDoc]);

  const handleLoad = () => {
    logger.info(LOG_CATEGORIES.PREVIEW, 'Iframe loaded successfully');
    setIsLoading(false);
  };

  const handleError = () => {
    const errorMsg = 'Failed to load preview content';
    logger.error(LOG_CATEGORIES.PREVIEW, errorMsg);
    setIsLoading(false);
    onError?.(errorMsg);
  };

  if (!srcDoc) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-900">
        <div className="text-center px-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-surface-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
          </div>
          <p className="text-surface-400 text-sm">
            Your generated UI will appear here
          </p>
          <p className="text-surface-500 text-xs mt-1">
            Start by describing what you want to build
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-900/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-surface-400">Loading preview...</p>
          </div>
        </div>
      )}
      <iframe
        key={iframeKey}
        title="Preview"
        srcDoc={srcDoc}
        className="w-full h-full bg-white border-0"
        sandbox="allow-scripts"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
