import type { LLMModel, ModelCategory, SubscriptionTier } from '../types';
import { CATEGORY_MIN_TIER } from '../types';

/**
 * Filter models based on user's subscription tier.
 * Models whose category requires a higher tier are marked as inaccessible.
 */
export function filterModelsByTier(models: LLMModel[], tier: SubscriptionTier): LLMModel[] {
  const tierOrder: Record<SubscriptionTier, number> = { free: 0, pro: 1, max: 2 };
  const userTierLevel = tierOrder[tier];

  return models.map(model => ({
    ...model,
    accessible: tierOrder[CATEGORY_MIN_TIER[model.category]] <= userTierLevel,
  }));
}

/**
 * Get only accessible models for a tier (filters out inaccessible ones).
 */
export function getAccessibleModels(models: LLMModel[], tier: SubscriptionTier): LLMModel[] {
  return filterModelsByTier(models, tier).filter(m => m.accessible);
}

/**
 * Sort models: by category order, then by priority within category.
 */
export function sortModels(models: LLMModel[]): LLMModel[] {
  const categoryOrder: Record<ModelCategory, number> = {
    budget: 0,
    standard: 1,
    premium: 2,
    frontier: 3,
  };

  const priorityModels = [
    'deepseek/deepseek-v3.2',
    'meta-llama/llama-4-maverick',
    'openai/gpt-5.1-codex-mini',
    'google/gemini-3-flash-preview',
    'anthropic/claude-haiku-4.5',
    'openai/gpt-5.2',
    'anthropic/claude-sonnet-4.6',
    'anthropic/claude-opus-4.6',
  ];

  return models.sort((a, b) => {
    const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (catDiff !== 0) return catDiff;

    const aPriority = priorityModels.indexOf(a.id);
    const bPriority = priorityModels.indexOf(b.id);

    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;

    return a.name.localeCompare(b.name);
  });
}

/**
 * Group models by category.
 */
export function groupModelsByCategory(models: LLMModel[]): Record<ModelCategory, LLMModel[]> {
  const groups: Record<ModelCategory, LLMModel[]> = {
    budget: [],
    standard: [],
    premium: [],
    frontier: [],
  };

  for (const model of models) {
    groups[model.category].push(model);
  }

  return groups;
}
