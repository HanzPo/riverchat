import { type ModelCategory, MARKUP_MULTIPLIER } from './tiers.js';

export interface ModelConfig {
  id: string;
  displayName: string;
  provider: string;
  category: ModelCategory;
  contextLength: number;
  /** OpenRouter price per million tokens (in dollars) */
  openRouterPricing: {
    prompt: number;
    completion: number;
  };
  /** Our price per million tokens (in dollars, with markup) */
  pricing: {
    prompt: number;
    completion: number;
  };
}

interface ModelDef {
  id: string;
  displayName: string;
  provider: string;
  category: ModelCategory;
  contextLength: number;
  /** OpenRouter price per million tokens [prompt, completion] */
  orPrice: [number, number];
}

const MODEL_DEFS: ModelDef[] = [
  // Budget
  { id: 'meta-llama/llama-4-scout', displayName: 'Llama 4 Scout', provider: 'Meta', category: 'budget', contextLength: 512000, orPrice: [0.08, 0.30] },
  { id: 'meta-llama/llama-4-maverick', displayName: 'Llama 4 Maverick', provider: 'Meta', category: 'budget', contextLength: 256000, orPrice: [0.15, 0.60] },
  { id: 'deepseek/deepseek-v3.2', displayName: 'DeepSeek V3.2', provider: 'DeepSeek', category: 'budget', contextLength: 128000, orPrice: [0.25, 0.40] },
  { id: 'minimax/minimax-m2.5', displayName: 'MiniMax M2.5', provider: 'MiniMax', category: 'budget', contextLength: 196608, orPrice: [0.27, 0.95] },

  // Standard
  { id: 'openai/gpt-5.1-codex-mini', displayName: 'GPT-5.1 Codex Mini', provider: 'OpenAI', category: 'standard', contextLength: 200000, orPrice: [0.25, 2.00] },
  { id: 'moonshotai/kimi-k2.5', displayName: 'Kimi K2.5', provider: 'Moonshot', category: 'standard', contextLength: 128000, orPrice: [0.45, 2.20] },
  { id: 'qwen/qwen3.5-plus-02-15', displayName: 'Qwen 3.5 Plus', provider: 'Qwen', category: 'standard', contextLength: 1000000, orPrice: [0.26, 1.56] },
  { id: 'mistralai/mistral-large-2512', displayName: 'Mistral Large 3', provider: 'Mistral', category: 'standard', contextLength: 128000, orPrice: [0.50, 1.50] },
  { id: 'deepseek/deepseek-r1', displayName: 'DeepSeek R1', provider: 'DeepSeek', category: 'standard', contextLength: 128000, orPrice: [0.70, 2.50] },
  { id: 'google/gemini-3-flash-preview', displayName: 'Gemini 3 Flash', provider: 'Google', category: 'standard', contextLength: 1000000, orPrice: [0.50, 3.00] },

  // Premium
  { id: 'anthropic/claude-haiku-4.5', displayName: 'Claude Haiku 4.5', provider: 'Anthropic', category: 'premium', contextLength: 200000, orPrice: [1.00, 5.00] },
  { id: 'openai/gpt-5.1', displayName: 'GPT-5.1', provider: 'OpenAI', category: 'premium', contextLength: 200000, orPrice: [1.25, 10.00] },
  { id: 'openai/gpt-5.3-codex', displayName: 'GPT-5.3 Codex', provider: 'OpenAI', category: 'premium', contextLength: 200000, orPrice: [1.75, 14.00] },
  { id: 'openai/gpt-5.2', displayName: 'GPT-5.2', provider: 'OpenAI', category: 'premium', contextLength: 200000, orPrice: [1.75, 14.00] },
  { id: 'google/gemini-3.1-pro-preview', displayName: 'Gemini 3.1 Pro', provider: 'Google', category: 'premium', contextLength: 1000000, orPrice: [2.00, 12.00] },
  { id: 'anthropic/claude-sonnet-4.6', displayName: 'Claude Sonnet 4.6', provider: 'Anthropic', category: 'premium', contextLength: 200000, orPrice: [3.00, 15.00] },

  // Frontier
  { id: 'anthropic/claude-opus-4.5', displayName: 'Claude Opus 4.5', provider: 'Anthropic', category: 'frontier', contextLength: 200000, orPrice: [5.00, 25.00] },
  { id: 'anthropic/claude-opus-4.6', displayName: 'Claude Opus 4.6', provider: 'Anthropic', category: 'frontier', contextLength: 200000, orPrice: [5.00, 25.00] },
  { id: 'openai/gpt-5.2-pro', displayName: 'GPT-5.2 Pro', provider: 'OpenAI', category: 'frontier', contextLength: 200000, orPrice: [21.00, 168.00] },
];

/** All models with computed markup pricing */
export const MODEL_CATALOG: ModelConfig[] = MODEL_DEFS.map((def) => ({
  id: def.id,
  displayName: def.displayName,
  provider: def.provider,
  category: def.category,
  contextLength: def.contextLength,
  openRouterPricing: {
    prompt: def.orPrice[0],
    completion: def.orPrice[1],
  },
  pricing: {
    prompt: parseFloat((def.orPrice[0] * MARKUP_MULTIPLIER).toFixed(4)),
    completion: parseFloat((def.orPrice[1] * MARKUP_MULTIPLIER).toFixed(4)),
  },
}));

/** Lookup a model by ID */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CATALOG.find((m) => m.id === modelId);
}

/**
 * Calculate cost in cents for a request.
 * Uses OpenRouter pricing (our actual cost) for deduction tracking,
 * and our markup pricing for what we charge the user.
 */
export function calculateCostCents(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): { ourCostCents: number; userCostCents: number } {
  const model = getModelConfig(modelId);
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  // OpenRouter prices are per million tokens (in dollars)
  const ourCostDollars =
    (promptTokens * model.openRouterPricing.prompt) / 1_000_000 +
    (completionTokens * model.openRouterPricing.completion) / 1_000_000;

  const userCostDollars =
    (promptTokens * model.pricing.prompt) / 1_000_000 +
    (completionTokens * model.pricing.completion) / 1_000_000;

  return {
    ourCostCents: Math.ceil(ourCostDollars * 100),
    userCostCents: Math.ceil(userCostDollars * 100),
  };
}
