// Core types for RiverChat

// OpenRouter model data from API
export interface OpenRouterModel {
  id: string; // e.g., "openai/gpt-4o"
  name: string; // e.g., "GPT-4o"
  description?: string;
  context_length: number;
  pricing: {
    prompt: string; // Cost per million prompt tokens
    completion: string; // Cost per million completion tokens
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated: boolean;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string | null;
  };
}

export interface LLMModel {
  id: string; // OpenRouter model ID (e.g., "openai/gpt-4o")
  name: string; // Display name
  description?: string;
  contextLength: number;
  pricing: {
    prompt: number; // Cost per million prompt tokens
    completion: number; // Cost per million completion tokens
  };
  isFree: boolean; // Whether the model is free
  provider: string; // e.g., "OpenAI", "Anthropic", "Google"
}

export interface APIKeys {
  openrouter: string;
}

// Pricing and subscription types
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  monthlyCredits: number;
  price: number; // in USD
  features: string[];
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number; // Positive for addition, negative for usage
  type: 'purchase' | 'subscription' | 'usage' | 'refund';
  description: string;
  modelUsed?: string; // For usage transactions
  timestamp: any; // Firestore timestamp
  balanceAfter: number;
}

export interface UserCredits {
  balance: number;
  subscriptionTier: SubscriptionTier;
  monthlyCredits: number;
  nextRefreshDate: string | null;
  lastUpdated: any; // Firestore timestamp
}

export interface Settings {
  apiKeys: APIKeys;
  lastUsedModel: LLMModel | null;
  enabledModels: Record<string, boolean>; // Model ID -> enabled status (single source of truth)
  lastChatSelectedModels?: LLMModel[]; // Last selected models in chat (persists across prompts)
  availableModels?: LLMModel[]; // All available models from OpenRouter (cached)
}

export type NodeType = 'user' | 'ai';

export type NodeState = 'complete' | 'generating' | 'error';

export interface MessageNode {
  id: string;
  type: NodeType;
  content: string;
  timestamp: number;
  parentId: string | null;
  state: NodeState;
  model?: LLMModel; // Only for AI nodes
  error?: string; // Only for error state
  position?: { x: number; y: number }; // Node position in the canvas
  branchMetadata?: BranchMetadata; // Metadata for branches created from text selection
}

export interface BranchMetadata {
  sourceNodeId: string; // The node this was branched from
  highlightedText: string; // The text that was highlighted
  elaborationPrompt?: string; // The prompt used for elaboration
}

export interface River {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  nodes: Record<string, MessageNode>;
  rootNodeId: string | null;
}

export interface RiverChatData {
  rivers: River[];
  settings: Settings;
  activeRiverId: string | null;
}

export interface ContextMenuItem {
  label: string;
  action: string;
  condition?: (node: MessageNode) => boolean;
}

// Vue Flow specific types
export interface VueFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: MessageNode;
}

export interface VueFlowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: Record<string, string>;
}

// Shared OpenRouter API key (for free tier users)
export const SHARED_OPENROUTER_API_KEY = import.meta.env.VITE_SHARED_OPENROUTER_API_KEY || '';

/**
 * Helper function to get list of enabled models from enabledModels record
 */
export function getEnabledModelsList(enabledModels: Record<string, boolean>, availableModels: LLMModel[]): LLMModel[] {
  return availableModels.filter(model => enabledModels[model.id] === true);
}

/**
 * Helper function to create default enabledModels record
 */
export function getDefaultEnabledModelsRecord(models: LLMModel[]): Record<string, boolean> {
  const record: Record<string, boolean> = {};
  
  // Preferred default models to enable
  const defaultModelIds = [
    'google/gemma-3n-e4b-it:free',
    'mistralai/mistral-7b-instruct:free',
    'moonshotai/kimi-k2:free',
    'openai/gpt-oss-20b:free',
  ];
  
  // Enable all preferred default models that are available
  const enabledCount = defaultModelIds.reduce((count, modelId) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      record[model.id] = true;
      return count + 1;
    }
    return count;
  }, 0);
  
  // Fallback: if none of the preferred models are available, enable first few models
  if (enabledCount === 0) {
    models.slice(0, Math.min(5, models.length)).forEach(model => {
      record[model.id] = true;
    });
  }
  
  return record;
}

/**
 * Helper function to validate and clean up selected models
 * Returns a cleaned list of models that are still valid based on current settings
 */
export function validateSelectedModels(
  selectedModels: LLMModel[],
  availableModels: LLMModel[],
  enabledModels: Record<string, boolean>
): LLMModel[] {
  if (!selectedModels || selectedModels.length === 0) {
    return [];
  }

  // Create a map of available models by ID for fast lookup
  const availableModelsMap = new Map(availableModels.map(m => [m.id, m]));
  
  // Filter selected models to only include:
  // 1. Models that are still available (API key hasn't changed)
  // 2. Models that are still enabled
  const validModels = selectedModels.filter(model => {
    const availableModel = availableModelsMap.get(model.id);
    // Check if model exists in available models and is enabled
    return availableModel && enabledModels[model.id] === true;
  });

  return validModels;
}

// Subscription tier configurations
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionInfo> = {
  free: {
    tier: 'free',
    monthlyCredits: 0,
    price: 0,
    features: ['Access to Gemini 2.0 Flash', 'Limited usage', 'Bring your own API keys'],
  },
  basic: {
    tier: 'basic',
    monthlyCredits: 10000,
    price: 9.99,
    features: ['10,000 credits/month', 'Access to all models', 'Priority support', 'No rate limits'],
  },
  pro: {
    tier: 'pro',
    monthlyCredits: 50000,
    price: 29.99,
    features: ['50,000 credits/month', 'Access to all models', 'Priority support', 'Advanced features', 'API access'],
  },
  enterprise: {
    tier: 'enterprise',
    monthlyCredits: 200000,
    price: 99.99,
    features: ['200,000 credits/month', 'Access to all models', '24/7 support', 'Custom integrations', 'Dedicated account manager'],
  },
};

