import type { OpenRouterModel, LLMModel } from '../types';
import { SHARED_OPENROUTER_API_KEY } from '../types';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

/**
 * Fetch all available models from OpenRouter
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    throw error;
  }
}

/**
 * Extract provider name from model ID
 * e.g., "openai/gpt-4o" -> "OpenAI"
 */
function extractProviderName(modelId: string): string {
  const providerSlug = modelId.split('/')[0] || '';

  // Map common provider slugs to display names
  const providerMap: Record<string, string> = {
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'google': 'Google',
    'meta-llama': 'Meta',
    'mistralai': 'Mistral',
    'cohere': 'Cohere',
    'ai21': 'AI21',
    'huggingfaceh4': 'HuggingFace',
    'nousresearch': 'Nous Research',
    'gryphe': 'Gryphe',
    'undi95': 'Undi95',
    'pygmalionai': 'PygmalionAI',
    'alpindale': 'AlpinDale',
    'koboldai': 'KoboldAI',
    'microsoft': 'Microsoft',
  };

  return providerMap[providerSlug] || providerSlug.charAt(0).toUpperCase() + providerSlug.slice(1);
}

/**
 * Transform OpenRouter model to our LLMModel format
 */
export function transformOpenRouterModel(orModel: OpenRouterModel): LLMModel {
  const promptPrice = parseFloat(orModel.pricing.prompt);
  const completionPrice = parseFloat(orModel.pricing.completion);

  // A model is considered free if both prompt and completion prices are 0
  const isFree = promptPrice === 0 && completionPrice === 0;

  return {
    id: orModel.id,
    name: orModel.name,
    description: orModel.description,
    contextLength: orModel.context_length,
    pricing: {
      prompt: promptPrice * 1000000, // Convert to cost per million tokens
      completion: completionPrice * 1000000,
    },
    isFree,
    provider: extractProviderName(orModel.id),
  };
}

/**
 * Fetch and transform all available models
 */
export async function getAvailableModels(): Promise<LLMModel[]> {
  const orModels = await fetchOpenRouterModels();
  return orModels.map(transformOpenRouterModel);
}

/**
 * Filter models based on API key
 * If using shared key, only return free models
 * If using custom key, return all models
 */
export function filterModelsByApiKey(models: LLMModel[], apiKey: string): LLMModel[] {
  const isUsingSharedKey = !apiKey || apiKey === SHARED_OPENROUTER_API_KEY;

  if (isUsingSharedKey) {
    // Only free models for shared key users
    return models.filter(model => model.isFree);
  }

  // All models for custom key users
  return models;
}

/**
 * Sort models by relevance (popular models first, then alphabetically)
 */
export function sortModels(models: LLMModel[]): LLMModel[] {
  // Define priority models that should appear first
  const priorityModels = [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'google/gemini-pro',
    'google/gemini-flash',
  ];

  return models.sort((a, b) => {
    // Check if models are in priority list
    const aPriority = priorityModels.indexOf(a.id);
    const bPriority = priorityModels.indexOf(b.id);

    // Both in priority list - sort by priority order
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }

    // Only a is in priority list
    if (aPriority !== -1) return -1;

    // Only b is in priority list
    if (bPriority !== -1) return 1;

    // Neither in priority list - sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
}
