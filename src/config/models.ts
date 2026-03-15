import type { LLMModel, ModelCategory } from '../types';

const MARKUP = 1.5;

interface ModelDef {
  id: string;
  name: string;
  provider: string;
  category: ModelCategory;
  contextLength: number;
  orPrice: [number, number]; // [prompt, completion] per 1M tokens in dollars
}

const DEFS: ModelDef[] = [
  // Budget
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta', category: 'budget', contextLength: 512000, orPrice: [0.08, 0.30] },
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', category: 'budget', contextLength: 256000, orPrice: [0.15, 0.60] },
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek', category: 'budget', contextLength: 128000, orPrice: [0.25, 0.40] },
  { id: 'minimax/minimax-m2.5', name: 'MiniMax M2.5', provider: 'MiniMax', category: 'budget', contextLength: 196608, orPrice: [0.27, 0.95] },

  // Standard
  { id: 'openai/gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini', provider: 'OpenAI', category: 'standard', contextLength: 200000, orPrice: [0.25, 2.00] },
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', provider: 'Moonshot', category: 'standard', contextLength: 128000, orPrice: [0.45, 2.20] },
  { id: 'qwen/qwen3.5-plus-02-15', name: 'Qwen 3.5 Plus', provider: 'Qwen', category: 'standard', contextLength: 1000000, orPrice: [0.26, 1.56] },
  { id: 'mistralai/mistral-large-2512', name: 'Mistral Large 3', provider: 'Mistral', category: 'standard', contextLength: 128000, orPrice: [0.50, 1.50] },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', category: 'standard', contextLength: 128000, orPrice: [0.70, 2.50] },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google', category: 'standard', contextLength: 1000000, orPrice: [0.50, 3.00] },

  // Premium
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', category: 'premium', contextLength: 200000, orPrice: [1.00, 5.00] },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI', category: 'premium', contextLength: 200000, orPrice: [1.25, 10.00] },
  { id: 'openai/gpt-5.3-codex', name: 'GPT-5.3 Codex', provider: 'OpenAI', category: 'premium', contextLength: 200000, orPrice: [1.75, 14.00] },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI', category: 'premium', contextLength: 200000, orPrice: [1.75, 14.00] },
  { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google', category: 'premium', contextLength: 1000000, orPrice: [2.00, 12.00] },
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', category: 'premium', contextLength: 200000, orPrice: [3.00, 15.00] },

  // Frontier
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic', category: 'frontier', contextLength: 200000, orPrice: [5.00, 25.00] },
  { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', provider: 'Anthropic', category: 'frontier', contextLength: 200000, orPrice: [5.00, 25.00] },
  { id: 'openai/gpt-5.2-pro', name: 'GPT-5.2 Pro', provider: 'OpenAI', category: 'frontier', contextLength: 200000, orPrice: [21.00, 168.00] },
];

/** Client-side fallback model catalog (mirrors server-side config) */
export const FALLBACK_MODELS: LLMModel[] = DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  provider: d.provider,
  category: d.category,
  contextLength: d.contextLength,
  pricing: {
    prompt: parseFloat((d.orPrice[0] * MARKUP).toFixed(4)),
    completion: parseFloat((d.orPrice[1] * MARKUP).toFixed(4)),
  },
}));
