import { useMemo } from 'react';
import { User, Bot, Zap, AlertTriangle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import type { Message } from '@/types';
import { formatTokenCount } from '@/services/tokenTracker';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

/**
 * Simple markdown-like rendering for chat messages
 */
function renderContent(content: string, isStreaming: boolean): React.ReactNode {
  if (!content) {
    return isStreaming ? (
      <span className="text-surface-400 italic">Generating...</span>
    ) : null;
  }

  // Check if this is an error/status message
  const isStatusMessage = content.startsWith('⚠️') || content.startsWith('✅') || content.startsWith('❌') || content.startsWith('🔄');
  
  if (isStatusMessage) {
    // Split by double newlines for paragraphs
    const parts = content.split('\n\n');
    
    return (
      <div className="space-y-3">
        {parts.map((part, idx) => {
          // Render bold text
          const renderedPart = part.split(/(\*\*[^*]+\*\*)/g).map((segment, segIdx) => {
            if (segment.startsWith('**') && segment.endsWith('**')) {
              return (
                <strong key={segIdx} className="font-semibold text-surface-100">
                  {segment.slice(2, -2)}
                </strong>
              );
            }
            // Render inline code
            return segment.split(/(`[^`]+`)/g).map((codeSeg, codeIdx) => {
              if (codeSeg.startsWith('`') && codeSeg.endsWith('`')) {
                return (
                  <code key={`${segIdx}-${codeIdx}`} className="px-1.5 py-0.5 bg-surface-700 rounded text-primary-300 text-xs font-mono">
                    {codeSeg.slice(1, -1)}
                  </code>
                );
              }
              return codeSeg;
            });
          });

          // Check for list items
          if (part.startsWith('- ')) {
            const items = part.split('\n').filter(line => line.startsWith('- '));
            return (
              <ul key={idx} className="space-y-1 text-sm">
                {items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2">
                    <span className="text-surface-500 mt-1">•</span>
                    <span>{item.slice(2)}</span>
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p key={idx} className="text-sm whitespace-pre-wrap">
              {renderedPart}
            </p>
          );
        })}
        {isStreaming && (
          <span className="inline-flex items-center gap-1 text-primary-400">
            <Loader2 className="w-3 h-3 animate-spin" />
          </span>
        )}
      </div>
    );
  }

  // For regular messages, just strip code blocks for display
  const withoutCode = content
    .replace(/```[\s\S]*?```/g, '')
    .trim();
  
  const displayText = withoutCode || (content.includes('```') ? 'UI generated! Check the preview →' : content);
  
  return (
    <span>
      {displayText}
      {isStreaming && (
        <span className="inline-flex items-center gap-1 text-primary-400 ml-1">
          <span className="w-1.5 h-4 bg-primary-400 animate-pulse" />
        </span>
      )}
    </span>
  );
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Determine message type for styling
  const messageType = useMemo(() => {
    if (message.content.startsWith('⚠️')) return 'warning';
    if (message.content.startsWith('✅')) return 'success';
    if (message.content.startsWith('❌')) return 'error';
    if (message.content.startsWith('🔄')) return 'retry';
    if (message.content.includes('[Generation stopped')) return 'stopped';
    return 'default';
  }, [message.content]);

  const formattedTime = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [message.timestamp]);

  // Get status icon
  const StatusIcon = useMemo(() => {
    if (isStreaming) return Loader2;
    switch (messageType) {
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      case 'error': return AlertTriangle;
      case 'retry': return RefreshCw;
      case 'stopped': return null;
      default: return null;
    }
  }, [messageType, isStreaming]);

  // Get bubble style based on message type
  const bubbleStyle = useMemo(() => {
    if (isUser) {
      return 'bg-gradient-to-r from-violet-500/20 to-violet-600/20 border border-violet-500/30 text-surface-100';
    }
    
    if (isStreaming) {
      return 'bg-primary-500/10 border border-primary-500/30 text-surface-200';
    }
    
    switch (messageType) {
      case 'warning':
        return 'bg-amber-500/10 border border-amber-500/30 text-surface-200';
      case 'success':
        return 'bg-green-500/10 border border-green-500/30 text-surface-200';
      case 'error':
        return 'bg-red-500/10 border border-red-500/30 text-surface-200';
      case 'retry':
        return 'bg-blue-500/10 border border-blue-500/30 text-surface-200';
      case 'stopped':
        return 'bg-surface-800/30 border border-surface-700 text-surface-400';
      default:
        return 'bg-surface-800/50 border border-surface-700 text-surface-200';
    }
  }, [isUser, messageType, isStreaming]);

  // Get avatar style
  const avatarStyle = useMemo(() => {
    if (isUser) {
      return 'bg-gradient-to-br from-violet-500 to-violet-600';
    }
    if (isStreaming) {
      return 'bg-gradient-to-br from-primary-500 to-primary-600';
    }
    switch (messageType) {
      case 'error':
        return 'bg-gradient-to-br from-red-500 to-red-600';
      case 'warning':
        return 'bg-gradient-to-br from-amber-500 to-amber-600';
      case 'success':
        return 'bg-gradient-to-br from-green-500 to-green-600';
      default:
        return 'bg-gradient-to-br from-primary-500 to-primary-600';
    }
  }, [isUser, messageType, isStreaming]);

  return (
    <div 
      className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div 
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${avatarStyle}`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : StatusIcon ? (
          <StatusIcon className={`w-4 h-4 text-white ${isStreaming ? 'animate-spin' : ''}`} />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div 
          className={`inline-block rounded-2xl px-4 py-3 ${bubbleStyle}`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm whitespace-pre-wrap">
              {renderContent(message.content, isStreaming)}
            </div>
          )}
        </div>
        
        {/* Meta info */}
        <div 
          className={`flex items-center gap-2 mt-1 text-xs text-surface-500 ${isUser ? 'justify-end' : ''}`}
        >
          <span>{formattedTime}</span>
          {isStreaming && (
            <>
              <span>•</span>
              <span className="text-primary-400">Streaming...</span>
            </>
          )}
          {!isStreaming && message.tokenUsage && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {formatTokenCount(message.tokenUsage.totalTokens)} tokens
              </span>
            </>
          )}
          {!isStreaming && message.code && (
            <>
              <span>•</span>
              <span className="text-green-400">Code generated</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
