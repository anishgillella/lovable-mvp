import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface PreviewErrorProps {
  error: string;
  onRetry?: () => void;
}

export function PreviewError({ error, onRetry }: PreviewErrorProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-surface-900 p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-surface-100 mb-2">
          Preview Error
        </h3>
        <p className="text-sm text-surface-400 mb-4">
          There was an issue rendering the generated code:
        </p>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <code className="text-sm text-red-300 break-all">
            {error}
          </code>
        </div>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}


