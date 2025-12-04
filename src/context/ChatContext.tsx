import { createContext, useContext, useReducer, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { ChatState, ChatAction, Message, GeneratedCode } from '@/types';
import { STORAGE_KEYS, INITIAL_TOKEN_STATS } from '@/utils/constants';
import { generateUIStream } from '@/services/openai';
import { extractCode, validateCode, formatErrorsForDisplay, formatErrorsForAI } from '@/utils/codeExtractor';
import { updateTokenStats } from '@/services/tokenTracker';
import { logger, LOG_CATEGORIES } from '@/utils/logger';

// Extended state for streaming
interface ExtendedChatState extends ChatState {
  streamingContent: string;
  streamingMessageId: string | null;
}

// Extended actions
type ExtendedChatAction = 
  | ChatAction
  | { type: 'SET_STREAMING_CONTENT'; payload: { id: string; content: string } }
  | { type: 'CLEAR_STREAMING' }
  | { type: 'UPDATE_MESSAGE_CONTENT'; payload: { id: string; content: string; code?: GeneratedCode } };

// Initial state
const initialState: ExtendedChatState = {
  messages: [],
  isLoading: false,
  error: null,
  currentCode: null,
  tokenStats: INITIAL_TOKEN_STATS,
  streamingContent: '',
  streamingMessageId: null,
};

// Reducer
function chatReducer(state: ExtendedChatState, action: ExtendedChatAction): ExtendedChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      logger.debug(LOG_CATEGORIES.CHAT, 'Adding message', { 
        role: action.payload.role,
        hasCode: !!action.payload.code,
      });
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'SET_LOADING':
      logger.debug(LOG_CATEGORIES.CHAT, `Loading: ${action.payload}`);
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      if (action.payload) {
        logger.error(LOG_CATEGORIES.CHAT, 'Error set', { error: action.payload });
      }
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_CURRENT_CODE':
      logger.info(LOG_CATEGORIES.CHAT, 'Setting current code', {
        hasCode: !!action.payload,
        htmlLength: action.payload?.html.length || 0,
        cssLength: action.payload?.css.length || 0,
        jsLength: action.payload?.js.length || 0,
        combinedLength: action.payload?.combined.length || 0,
      });
      return {
        ...state,
        currentCode: action.payload,
      };
    case 'UPDATE_TOKEN_STATS':
      return {
        ...state,
        tokenStats: updateTokenStats(state.tokenStats, action.payload),
      };
    case 'LOAD_STATE':
      logger.info(LOG_CATEGORIES.STORAGE, 'Loading state from localStorage');
      return {
        ...state,
        ...action.payload,
      };
    case 'CLEAR_CHAT':
      logger.info(LOG_CATEGORIES.CHAT, 'Clearing chat');
      return {
        ...initialState,
      };
    case 'SET_STREAMING_CONTENT':
      return {
        ...state,
        streamingContent: action.payload.content,
        streamingMessageId: action.payload.id,
      };
    case 'CLEAR_STREAMING':
      return {
        ...state,
        streamingContent: '',
        streamingMessageId: null,
      };
    case 'UPDATE_MESSAGE_CONTENT':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { ...msg, content: action.payload.content, code: action.payload.code || msg.code }
            : msg
        ),
      };
    default:
      return state;
  }
}

// Context type
interface ChatContextType extends ExtendedChatState {
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearChat: () => void;
  setCurrentCode: (code: GeneratedCode | null) => void;
}

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      logger.info(LOG_CATEGORIES.STORAGE, 'Loading saved state from localStorage');
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const savedTokenStats = localStorage.getItem(STORAGE_KEYS.TOKEN_STATS);
      const savedCode = localStorage.getItem(STORAGE_KEYS.CURRENT_CODE);

      const loadedState: Partial<ChatState> = {};

      if (savedMessages) {
        loadedState.messages = JSON.parse(savedMessages);
        logger.debug(LOG_CATEGORIES.STORAGE, 'Loaded messages', { count: loadedState.messages?.length });
      }
      if (savedTokenStats) {
        loadedState.tokenStats = JSON.parse(savedTokenStats);
        logger.debug(LOG_CATEGORIES.STORAGE, 'Loaded token stats', loadedState.tokenStats);
      }
      if (savedCode) {
        loadedState.currentCode = JSON.parse(savedCode);
        logger.debug(LOG_CATEGORIES.STORAGE, 'Loaded saved code', {
          htmlLength: loadedState.currentCode?.html.length,
          cssLength: loadedState.currentCode?.css.length,
          jsLength: loadedState.currentCode?.js.length,
        });
      }

      if (Object.keys(loadedState).length > 0) {
        dispatch({ type: 'LOAD_STATE', payload: loadedState });
      }
    } catch (error) {
      logger.error(LOG_CATEGORIES.STORAGE, 'Error loading from localStorage', { error });
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(state.messages));
      localStorage.setItem(STORAGE_KEYS.TOKEN_STATS, JSON.stringify(state.tokenStats));
      if (state.currentCode) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CODE, JSON.stringify(state.currentCode));
        logger.debug(LOG_CATEGORIES.STORAGE, 'Saved current code to localStorage');
      }
    } catch (error) {
      logger.error(LOG_CATEGORIES.STORAGE, 'Error saving to localStorage', { error });
    }
  }, [state.messages, state.tokenStats, state.currentCode]);

  // Stop generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      logger.info(LOG_CATEGORIES.CHAT, 'Stopping generation...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Send message to AI with streaming
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || state.isLoading) return;

    logger.group('Send Message Flow (Streaming)');
    logger.info(LOG_CATEGORIES.CHAT, 'User sending message', { 
      content: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
    });

    // Create abort controller
    abortControllerRef.current = new AbortController();

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    // Create placeholder assistant message for streaming
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

    try {
      // First attempt with streaming
      logger.info(LOG_CATEGORIES.CHAT, 'Starting streaming generation');
      
      let streamedContent = '';
      const response = await generateUIStream(
        content,
        state.messages,
        state.currentCode,
        (_chunk, fullContent) => {
          streamedContent = fullContent;
          dispatch({ 
            type: 'SET_STREAMING_CONTENT', 
            payload: { id: assistantMessageId, content: fullContent } 
          });
          // Update the message content as it streams
          dispatch({
            type: 'UPDATE_MESSAGE_CONTENT',
            payload: { id: assistantMessageId, content: fullContent }
          });
        },
        abortControllerRef.current.signal
      );

      // Clear streaming state
      dispatch({ type: 'CLEAR_STREAMING' });

      // Check if was stopped
      if (abortControllerRef.current?.signal.aborted) {
        logger.info(LOG_CATEGORIES.CHAT, 'Generation was stopped by user');
        // Update message to show it was stopped
        dispatch({
          type: 'UPDATE_MESSAGE_CONTENT',
          payload: { 
            id: assistantMessageId, 
            content: streamedContent + '\n\n*[Generation stopped by user]*' 
          }
        });
        dispatch({ type: 'SET_LOADING', payload: false });
        logger.groupEnd();
        return;
      }

      // Extract code from response
      logger.info(LOG_CATEGORIES.CODE, 'Extracting code from streamed response');
      const code = extractCode(response.content);
      
      logger.info(LOG_CATEGORIES.VALIDATION, 'Validating extracted code');
      const validation = validateCode(code);

      // Update token stats
      dispatch({ type: 'UPDATE_TOKEN_STATS', payload: response.usage });

      if (!validation.valid) {
        logger.warn(LOG_CATEGORIES.CHAT, 'Code has syntax errors, preparing retry');
        
        // Update message with error info
        const errorDisplay = formatErrorsForDisplay(validation.errors);
        dispatch({
          type: 'UPDATE_MESSAGE_CONTENT',
          payload: { 
            id: assistantMessageId, 
            content: `⚠️ **Syntax errors detected:**\n\n${errorDisplay}\n\n🔄 **Attempting automatic fix...**`,
            code: undefined
          }
        });

        // Create new abort controller for retry
        abortControllerRef.current = new AbortController();

        // Automatic retry with error context
        try {
          const retryMessageId = crypto.randomUUID();
          const retryMessage: Message = {
            id: retryMessageId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
          };
          dispatch({ type: 'ADD_MESSAGE', payload: retryMessage });

          logger.info(LOG_CATEGORIES.CHAT, 'Starting retry with streaming');
          const retryPrompt = formatErrorsForAI(validation.errors, code);
          
          const retryResponse = await generateUIStream(
            retryPrompt,
            [...state.messages, userMessage, { ...assistantMessage, content: response.content }],
            state.currentCode,
            (_chunk, fullContent) => {
              dispatch({ 
                type: 'SET_STREAMING_CONTENT', 
                payload: { id: retryMessageId, content: fullContent } 
              });
              dispatch({
                type: 'UPDATE_MESSAGE_CONTENT',
                payload: { id: retryMessageId, content: fullContent }
              });
            },
            abortControllerRef.current.signal
          );

          dispatch({ type: 'CLEAR_STREAMING' });
          dispatch({ type: 'UPDATE_TOKEN_STATS', payload: retryResponse.usage });

          const retryCode = extractCode(retryResponse.content);
          const retryValidation = validateCode(retryCode);

          if (retryValidation.valid) {
            logger.info(LOG_CATEGORIES.CHAT, '✅ Retry successful');
            dispatch({
              type: 'UPDATE_MESSAGE_CONTENT',
              payload: { 
                id: retryMessageId, 
                content: `✅ **Fixed!** The syntax errors have been resolved.\n\n${retryResponse.content}`,
                code: retryCode
              }
            });
            dispatch({ type: 'SET_CURRENT_CODE', payload: retryCode });
          } else {
            logger.warn(LOG_CATEGORIES.CHAT, '❌ Retry still has errors');
            const remainingErrors = formatErrorsForDisplay(retryValidation.errors);
            dispatch({
              type: 'UPDATE_MESSAGE_CONTENT',
              payload: { 
                id: retryMessageId, 
                content: `❌ **Some errors remain:**\n\n${remainingErrors}\n\n${retryResponse.content}`,
                code: retryCode
              }
            });
            dispatch({ type: 'SET_CURRENT_CODE', payload: retryCode });
          }
        } catch (retryError) {
          if (retryError instanceof Error && retryError.message === 'Generation stopped by user') {
            logger.info(LOG_CATEGORIES.CHAT, 'Retry was stopped by user');
          } else {
            logger.error(LOG_CATEGORIES.CHAT, 'Retry failed', { error: retryError });
          }
        }
      } else {
        // Code is valid on first try
        logger.info(LOG_CATEGORIES.CHAT, '✅ Code generated successfully');
        dispatch({
          type: 'UPDATE_MESSAGE_CONTENT',
          payload: { 
            id: assistantMessageId, 
            content: response.content,
            code 
          }
        });
        dispatch({ type: 'SET_CURRENT_CODE', payload: code });
      }
    } catch (error) {
      dispatch({ type: 'CLEAR_STREAMING' });
      
      if (error instanceof Error && error.message === 'Generation stopped by user') {
        logger.info(LOG_CATEGORIES.CHAT, 'Generation stopped by user');
        dispatch({
          type: 'UPDATE_MESSAGE_CONTENT',
          payload: { 
            id: assistantMessageId, 
            content: '*[Generation stopped by user]*' 
          }
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        logger.error(LOG_CATEGORIES.CHAT, 'Message flow failed', { error: errorMessage });
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        dispatch({
          type: 'UPDATE_MESSAGE_CONTENT',
          payload: { 
            id: assistantMessageId, 
            content: `❌ **Error:** ${errorMessage}` 
          }
        });
      }
    } finally {
      abortControllerRef.current = null;
      dispatch({ type: 'SET_LOADING', payload: false });
      logger.groupEnd();
    }
  }, [state.messages, state.currentCode, state.isLoading]);

  // Clear chat
  const clearChat = useCallback(() => {
    stopGeneration();
    logger.info(LOG_CATEGORIES.CHAT, 'Clearing all chat data');
    dispatch({ type: 'CLEAR_CHAT' });
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_STATS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CODE);
  }, [stopGeneration]);

  // Set current code manually
  const setCurrentCode = useCallback((code: GeneratedCode | null) => {
    dispatch({ type: 'SET_CURRENT_CODE', payload: code });
  }, []);

  const value: ChatContextType = {
    ...state,
    sendMessage,
    stopGeneration,
    clearChat,
    setCurrentCode,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook to use chat context
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
