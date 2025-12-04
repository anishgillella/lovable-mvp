// Model configuration
export const MODEL_CONFIG = {
  name: 'gpt-5-mini',
  maxTokens: 8192
} as const;

// Token costs per million tokens
export const TOKEN_COSTS = {
  'gpt-4o-mini': {
    input: 0.15 / 1_000_000,  // $0.15 per 1M input tokens
    output: 0.60 / 1_000_000, // $0.60 per 1M output tokens
  },
  'gpt-4o': {
    input: 2.50 / 1_000_000,  // $2.50 per 1M input tokens
    output: 10.00 / 1_000_000, // $10.00 per 1M output tokens
  },
  'gpt-5-mini': {
    input: 0.25 / 1_000_000,  // User-specified pricing
    output: 2.00 / 1_000_000,
  },
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  MESSAGES: 'solva_messages',
  TOKEN_STATS: 'solva_token_stats',
  CURRENT_CODE: 'solva_current_code',
} as const;

// UI Constants
export const UI_CONFIG = {
  maxMessageLength: 10000,
  autoSaveDebounce: 1000, // ms
  previewRefreshDebounce: 300, // ms
} as const;

// Default empty code
export const EMPTY_CODE = {
  html: '',
  css: '',
  js: '',
  combined: '',
} as const;

// Initial token stats
export const INITIAL_TOKEN_STATS = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCost: 0,
  requestCount: 0,
} as const;


