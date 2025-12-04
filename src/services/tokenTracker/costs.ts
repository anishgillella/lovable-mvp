import { TOKEN_COSTS, MODEL_CONFIG } from '@/utils/constants';
import type { TokenUsage, TokenStats } from '@/types';

type ModelName = keyof typeof TOKEN_COSTS;

/**
 * Calculate the cost for a single API call
 */
export function calculateCost(usage: TokenUsage, model: ModelName = MODEL_CONFIG.name as ModelName): number {
  const costs = TOKEN_COSTS[model] || TOKEN_COSTS['gpt-4o-mini'];
  
  const inputCost = usage.promptTokens * costs.input;
  const outputCost = usage.completionTokens * costs.output;
  
  return inputCost + outputCost;
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Format token count with thousands separator
 */
export function formatTokenCount(count: number): string {
  return count.toLocaleString();
}

/**
 * Update cumulative token stats
 */
export function updateTokenStats(
  currentStats: TokenStats, 
  newUsage: TokenUsage,
  model: ModelName = MODEL_CONFIG.name as ModelName
): TokenStats {
  const cost = calculateCost(newUsage, model);
  
  return {
    totalInputTokens: currentStats.totalInputTokens + newUsage.promptTokens,
    totalOutputTokens: currentStats.totalOutputTokens + newUsage.completionTokens,
    totalCost: currentStats.totalCost + cost,
    requestCount: currentStats.requestCount + 1,
  };
}

/**
 * Get a summary string of token usage
 */
export function getUsageSummary(stats: TokenStats): string {
  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
  return `${formatTokenCount(totalTokens)} tokens (${formatTokenCount(stats.totalInputTokens)} in / ${formatTokenCount(stats.totalOutputTokens)} out) • ${formatCost(stats.totalCost)}`;
}


