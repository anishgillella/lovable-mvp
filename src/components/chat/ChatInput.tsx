import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onStop, isLoading, placeholder = "Describe the UI you want to create..." }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-2 p-2 bg-surface-800/50 border border-surface-700 rounded-xl focus-within:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent text-surface-100 placeholder-surface-500 resize-none focus:outline-none text-sm py-2 px-2 max-h-[200px] disabled:opacity-50"
        />
        {isLoading ? (
          <Button
            onClick={onStop}
            variant="secondary"
            size="sm"
            className="flex-shrink-0 !p-2 !bg-red-500/20 !border-red-500/30 hover:!bg-red-500/30 !text-red-400"
            title="Stop generating"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!value.trim()}
            size="sm"
            className="flex-shrink-0 !p-2"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-surface-500 mt-2 text-center">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating... Click the stop button to cancel
          </span>
        ) : (
          <>
            Press <kbd className="px-1.5 py-0.5 bg-surface-800 rounded text-surface-400">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-surface-800 rounded text-surface-400">Shift+Enter</kbd> for new line
          </>
        )}
      </p>
    </div>
  );
}
