import OpenAI from 'openai';
import { MODEL_CONFIG } from '@/utils/constants';
import { SYSTEM_PROMPT, createConversationContext, formatUserMessage } from '@/utils/prompts';
import { logger, LOG_CATEGORIES } from '@/utils/logger';
import type { Message, OpenAIResponse, GeneratedCode } from '@/types';

const STORAGE_KEY = 'solva_openai_api_key';

// Get API key from localStorage or env
const getAPIKey = (): string | null => {
  // First check localStorage
  try {
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      logger.debug(LOG_CATEGORIES.OPENAI, 'Using API key from localStorage');
      return storedKey;
    }
  } catch {
    // localStorage not available
  }
  
  // Fall back to env variable
  const envKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  if (envKey) {
    logger.debug(LOG_CATEGORIES.OPENAI, 'Using API key from environment');
  }
  return envKey;
};

// Initialize OpenAI client
const getClient = (): OpenAI => {
  const apiKey = getAPIKey();
  
  if (!apiKey) {
    logger.error(LOG_CATEGORIES.OPENAI, 'No API key found');
    throw new Error('OpenAI API key not found. Please add your API key using the button in the top right corner.');
  }
  
  logger.debug(LOG_CATEGORIES.OPENAI, 'Creating OpenAI client', { 
    keyPrefix: apiKey.slice(0, 7) + '...' 
  });
  
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });
};

/**
 * Build messages array for OpenAI API
 */
function buildMessages(
  userMessage: string,
  conversationHistory: Message[],
  currentCode: GeneratedCode | null
): OpenAI.ChatCompletionMessageParam[] {
  const systemMessage = SYSTEM_PROMPT + createConversationContext(
    currentCode?.combined || null
  );
  
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
  ];
  
  // Add relevant conversation history (last 10 messages for context)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.role === 'user' 
        ? formatUserMessage(msg.content, !!currentCode)
        : msg.content,
    });
  }
  
  // Add the new user message
  messages.push({
    role: 'user',
    content: formatUserMessage(userMessage, !!currentCode),
  });

  return messages;
}

/**
 * Callback type for streaming updates
 */
export type StreamCallback = (chunk: string, fullContent: string) => void;

/**
 * Generate UI code from a user prompt (non-streaming version)
 */
export async function generateUI(
  userMessage: string,
  conversationHistory: Message[],
  currentCode: GeneratedCode | null
): Promise<OpenAIResponse> {
  logger.group('OpenAI API Call');
  logger.info(LOG_CATEGORIES.OPENAI, 'Starting UI generation', {
    userMessage: userMessage.slice(0, 100) + (userMessage.length > 100 ? '...' : ''),
    historyLength: conversationHistory.length,
    hasExistingCode: !!currentCode,
  });

  const client = getClient();
  const messages = buildMessages(userMessage, conversationHistory, currentCode);

  logger.debug(LOG_CATEGORIES.OPENAI, 'Messages prepared', {
    totalMessages: messages.length,
    model: MODEL_CONFIG.name,
    maxTokens: MODEL_CONFIG.maxTokens
  });
  
  try {
    logger.info(LOG_CATEGORIES.OPENAI, 'Sending request to OpenAI...');
    const startTime = performance.now();
    
    const response = await client.chat.completions.create({
      model: MODEL_CONFIG.name,
      messages,
      max_completion_tokens: MODEL_CONFIG.maxTokens
    });
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage;
    
    logger.info(LOG_CATEGORIES.OPENAI, 'Response received', {
      duration: `${duration}ms`,
      contentLength: content.length,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      finishReason: response.choices[0]?.finish_reason,
    });

    logger.debug(LOG_CATEGORIES.OPENAI, 'Response preview', {
      first200chars: content.slice(0, 200) + '...',
      hasHtmlBlock: content.includes('```html'),
      hasCssBlock: content.includes('```css'),
      hasJsBlock: content.includes('```javascript') || content.includes('```js'),
    });
    
    logger.groupEnd();
    
    return {
      content,
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.OPENAI, 'API request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof OpenAI.APIError ? 'APIError' : 'Unknown',
    });
    logger.groupEnd();
    
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your API key and try again.');
      }
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate UI code with streaming support
 */
export async function generateUIStream(
  userMessage: string,
  conversationHistory: Message[],
  currentCode: GeneratedCode | null,
  onStream: StreamCallback,
  abortSignal?: AbortSignal
): Promise<OpenAIResponse> {
  logger.group('OpenAI Streaming API Call');
  logger.info(LOG_CATEGORIES.OPENAI, 'Starting streaming UI generation', {
    userMessage: userMessage.slice(0, 100) + (userMessage.length > 100 ? '...' : ''),
    historyLength: conversationHistory.length,
    hasExistingCode: !!currentCode,
  });

  const client = getClient();
  const messages = buildMessages(userMessage, conversationHistory, currentCode);

  logger.debug(LOG_CATEGORIES.OPENAI, 'Messages prepared for streaming', {
    totalMessages: messages.length,
    model: MODEL_CONFIG.name,
    maxTokens: MODEL_CONFIG.maxTokens
  });
  
  try {
    logger.info(LOG_CATEGORIES.OPENAI, 'Starting stream...');
    const startTime = performance.now();
    
    const stream = await client.chat.completions.create({
      model: MODEL_CONFIG.name,
      messages,
      max_completion_tokens: MODEL_CONFIG.maxTokens,
      stream: true,
    });

    let fullContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      // Check if aborted
      if (abortSignal?.aborted) {
        logger.info(LOG_CATEGORIES.OPENAI, 'Stream aborted by user');
        break;
      }

      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        onStream(delta, fullContent);
      }

      // Get usage from final chunk if available
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens || 0;
        completionTokens = chunk.usage.completion_tokens || 0;
      }
    }
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Estimate tokens if not provided (rough approximation)
    if (completionTokens === 0) {
      completionTokens = Math.ceil(fullContent.length / 4);
    }
    if (promptTokens === 0) {
      const promptText = messages.map(m => m.content).join('');
      promptTokens = Math.ceil((typeof promptText === 'string' ? promptText.length : 0) / 4);
    }

    logger.info(LOG_CATEGORIES.OPENAI, 'Stream completed', {
      duration: `${duration}ms`,
      contentLength: fullContent.length,
      estimatedPromptTokens: promptTokens,
      estimatedCompletionTokens: completionTokens,
      wasAborted: abortSignal?.aborted || false,
    });

    logger.groupEnd();
    
    return {
      content: fullContent,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  } catch (error) {
    // Check if it's an abort error
    if (error instanceof Error && error.name === 'AbortError') {
      logger.info(LOG_CATEGORIES.OPENAI, 'Request aborted');
      logger.groupEnd();
      throw new Error('Generation stopped by user');
    }

    logger.error(LOG_CATEGORIES.OPENAI, 'Streaming request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof OpenAI.APIError ? 'APIError' : 'Unknown',
    });
    logger.groupEnd();
    
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your API key and try again.');
      }
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if API key is configured (either in localStorage or env)
 */
export function isAPIKeyConfigured(): boolean {
  return !!getAPIKey();
}

/**
 * Get the current API key (for display purposes - masked)
 */
export function getCurrentAPIKey(): string | null {
  return getAPIKey();
}
