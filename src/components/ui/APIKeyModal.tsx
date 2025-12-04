import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface APIKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentKey?: string;
}

const STORAGE_KEY = 'solva_openai_api_key';

export function getStoredAPIKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAPIKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch (error) {
    console.error('Failed to store API key:', error);
  }
}

export function clearStoredAPIKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear API key:', error);
  }
}

export function APIKeyModal({ isOpen, onClose, onSave, currentKey }: APIKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(currentKey || '');
      setError(null);
      setSaved(false);
    }
  }, [isOpen, currentKey]);

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      setError('Please enter an API key');
      return;
    }
    
    if (!trimmedKey.startsWith('sk-')) {
      setError('Invalid API key format. Should start with "sk-"');
      return;
    }
    
    setStoredAPIKey(trimmedKey);
    onSave(trimmedKey);
    setSaved(true);
    
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    clearStoredAPIKey();
    setApiKey('');
    onSave('');
    setError(null);
  };

  const maskedKey = currentKey 
    ? `${currentKey.slice(0, 7)}...${currentKey.slice(-4)}`
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Key Configuration">
      <div className="space-y-4">
        {/* Info */}
        <div className="flex items-start gap-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
          <Key className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-surface-300">
            <p>Enter your OpenAI API key to enable UI generation.</p>
            <p className="mt-1 text-surface-400">
              Your key is stored locally in your browser and never sent to any server except OpenAI.
            </p>
          </div>
        </div>

        {/* Current key indicator */}
        {maskedKey && !apiKey && (
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">Key configured: {maskedKey}</span>
            </div>
            <button
              onClick={handleClear}
              className="text-xs text-surface-400 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>
        )}

        {/* Input */}
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError(null);
              setSaved(false);
            }}
            placeholder="sk-proj-..."
            className="w-full bg-surface-800/50 border border-surface-700 rounded-lg px-4 py-3 pr-12
                       text-surface-100 placeholder-surface-500 font-mono text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
                       transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors"
          >
            {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Success */}
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <Check className="w-4 h-4" />
            API key saved successfully!
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={saved}>
            {saved ? 'Saved!' : 'Save Key'}
          </Button>
        </div>

        {/* Help link */}
        <p className="text-xs text-center text-surface-500">
          Get your API key from{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 hover:underline"
          >
            platform.openai.com
          </a>
        </p>
      </div>
    </Modal>
  );
}


