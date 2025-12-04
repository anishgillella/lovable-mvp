import { useEffect, useRef } from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui';

export function ChatContainer() {
  const { messages, isLoading, sendMessage, stopGeneration, clearChat, streamingMessageId, streamingContent } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive or content streams
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <h2 className="font-semibold text-surface-100">Chat</h2>
        </div>
        {messages.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearChat}
            className="text-surface-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-100 mb-2">
              Welcome to Solva
            </h3>
            <p className="text-sm text-surface-400 max-w-sm mb-6">
              Describe the UI you want to create and I'll generate the code for you. 
              You can then iterate on the design through our conversation.
            </p>
            <div className="space-y-2 w-full max-w-sm">
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">Try saying:</p>
              {[
                "Create a modern login form with email and password",
                "Build a pricing table with 3 tiers",
                "Design a dark-themed dashboard header",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  disabled={isLoading}
                  className="w-full text-left text-sm p-3 bg-surface-800/50 hover:bg-surface-800 border border-surface-700 rounded-lg text-surface-300 hover:text-surface-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                isStreaming={message.id === streamingMessageId}
              />
            ))}
            {isLoading && !streamingMessageId && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="bg-surface-800/50 border border-surface-700 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-primary-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-primary-400 rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-surface-800">
        <ChatInput 
          onSend={sendMessage}
          onStop={stopGeneration}
          isLoading={isLoading}
          placeholder={messages.length > 0 ? "Describe changes to make..." : "Describe the UI you want to create..."}
        />
      </div>
    </div>
  );
}
