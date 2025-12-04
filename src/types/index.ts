// Message types for chat
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  code?: GeneratedCode;
  tokenUsage?: TokenUsage;
}

// Generated code structure
export interface GeneratedCode {
  html: string;
  css: string;
  js: string;
  combined: string; // Full HTML document with embedded CSS/JS
}

// Token tracking
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TokenStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
}

// Chat context
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  currentCode: GeneratedCode | null;
  tokenStats: TokenStats;
}

export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_CODE'; payload: GeneratedCode | null }
  | { type: 'UPDATE_TOKEN_STATS'; payload: TokenUsage }
  | { type: 'LOAD_STATE'; payload: Partial<ChatState> }
  | { type: 'CLEAR_CHAT' };

// Preview state
export interface PreviewState {
  isCodeView: boolean;
  activeTab: 'html' | 'css' | 'js';
  hasError: boolean;
  errorMessage: string | null;
}

// API Response
export interface OpenAIResponse {
  content: string;
  usage: TokenUsage;
}


