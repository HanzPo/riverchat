// Core types for RiverChat

export type SubscriptionTier = 'free' | 'pro' | 'max';
export type ModelCategory = 'budget' | 'standard' | 'premium' | 'frontier';

export interface LLMModel {
  id: string; // OpenRouter model ID (e.g., "openai/gpt-5.2")
  name: string; // Display name
  description?: string;
  contextLength: number;
  pricing: {
    prompt: number; // Our price per million prompt tokens (with 1.5x markup)
    completion: number; // Our price per million completion tokens (with 1.5x markup)
  };
  category: ModelCategory;
  provider: string; // e.g., "OpenAI", "Anthropic", "Google"
  accessible?: boolean; // Whether user's tier can use this model
}

export interface UserBalance {
  subscriptionCredits: number; // cents
  prepaidCredits: number; // cents
  total: number; // cents
  tier: SubscriptionTier;
  currentPeriodEnd: number | null; // epoch ms
}

export interface UsageMetadata {
  cost: number; // cents
  promptTokens: number;
  completionTokens: number;
  balanceAfter?: {
    subscriptionCredits: number;
    prepaidCredits: number;
    total: number;
  };
}

export interface Settings {
  lastUsedModel: LLMModel | null;
  enabledModels: Record<string, boolean>; // Model ID -> enabled status
  lastChatSelectedModels?: LLMModel[]; // Last selected models in chat
  lastModelRefresh?: number; // Timestamp of last model list refresh
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

  // Preferred default models to enable (budget models)
  const defaultModelIds = [
    'deepseek/deepseek-v3.2',
    'meta-llama/llama-4-maverick',
    'meta-llama/llama-4-scout',
  ];

  const enabledCount = defaultModelIds.reduce((count, modelId) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      record[model.id] = true;
      return count + 1;
    }
    return count;
  }, 0);

  if (enabledCount === 0) {
    models.slice(0, Math.min(5, models.length)).forEach(model => {
      record[model.id] = true;
    });
  }

  return record;
}

/**
 * Helper function to validate and clean up selected models
 */
export function validateSelectedModels(
  selectedModels: LLMModel[],
  availableModels: LLMModel[],
  enabledModels: Record<string, boolean>
): LLMModel[] {
  if (!selectedModels || selectedModels.length === 0) {
    return [];
  }

  const availableModelsMap = new Map(availableModels.map(m => [m.id, m]));

  return selectedModels.filter(model => {
    const availableModel = availableModelsMap.get(model.id);
    return availableModel && enabledModels[model.id] === true;
  });
}

/** Category display order */
export const CATEGORY_ORDER: ModelCategory[] = ['budget', 'standard', 'premium', 'frontier'];

/** Human-readable category labels */
export const CATEGORY_LABELS: Record<ModelCategory, string> = {
  budget: 'Budget',
  standard: 'Standard',
  premium: 'Premium',
  frontier: 'Frontier',
};

/** Minimum tier required for each category */
export const CATEGORY_MIN_TIER: Record<ModelCategory, SubscriptionTier> = {
  budget: 'free',
  standard: 'pro',
  premium: 'pro',
  frontier: 'max',
};
