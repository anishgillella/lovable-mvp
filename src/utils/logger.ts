/**
 * Logging utility for Solva
 * Logs are shown in browser console with timestamps and categories
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

// Store logs in memory for debugging
const logHistory: LogEntry[] = [];
const MAX_LOG_HISTORY = 100;

// Enable/disable logging (can be toggled via console)
let isLoggingEnabled = true;

const LEVEL_COLORS = {
  debug: '#888',
  info: '#0ea5e9',
  warn: '#f59e0b',
  error: '#ef4444',
};

const LEVEL_ICONS = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
};

function formatTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function log(level: LogLevel, category: string, message: string, data?: unknown): void {
  if (!isLoggingEnabled) return;

  const timestamp = formatTimestamp();
  const entry: LogEntry = { timestamp, level, category, message, data };
  
  // Store in history
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }

  // Console output with styling
  const icon = LEVEL_ICONS[level];
  const color = LEVEL_COLORS[level];
  
  const prefix = `%c${icon} [${timestamp}] [${category}]`;
  const style = `color: ${color}; font-weight: bold;`;
  
  if (data !== undefined) {
    console[level](prefix, style, message, data);
  } else {
    console[level](prefix, style, message);
  }
}

// Public API
export const logger = {
  debug: (category: string, message: string, data?: unknown) => log('debug', category, message, data),
  info: (category: string, message: string, data?: unknown) => log('info', category, message, data),
  warn: (category: string, message: string, data?: unknown) => log('warn', category, message, data),
  error: (category: string, message: string, data?: unknown) => log('error', category, message, data),
  
  // Get log history
  getHistory: () => [...logHistory],
  
  // Clear log history
  clear: () => {
    logHistory.length = 0;
    console.clear();
  },
  
  // Enable/disable logging
  enable: () => { isLoggingEnabled = true; },
  disable: () => { isLoggingEnabled = false; },
  
  // Log group helpers
  group: (label: string) => console.group(`📁 ${label}`),
  groupEnd: () => console.groupEnd(),
};

// Make logger available globally for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { solvaLogger: typeof logger }).solvaLogger = logger;
}

// Log categories used in the app
export const LOG_CATEGORIES = {
  OPENAI: 'OpenAI',
  CHAT: 'Chat',
  PREVIEW: 'Preview',
  CODE: 'CodeExtractor',
  VALIDATION: 'Validation',
  STORAGE: 'Storage',
  UI: 'UI',
} as const;


