// Core types for RiverChat

export type LLMProvider = 'openai' | 'anthropic' | 'google';

export interface LLMModel {
  provider: LLMProvider;
  name: string;
  displayName: string;
}

export interface APIKeys {
  openai: string;
  anthropic: string;
  google: string;
}

export interface Settings {
  apiKeys: APIKeys;
  theme: 'light' | 'dark';
  lastUsedModel: LLMModel | null;
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

// Available LLM Models
export const AVAILABLE_MODELS: LLMModel[] = [
  { provider: 'openai', name: 'gpt-4o', displayName: 'GPT-4o' },
  { provider: 'openai', name: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
  { provider: 'openai', name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo' },
  { provider: 'anthropic', name: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet' },
  { provider: 'anthropic', name: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku' },
  { provider: 'anthropic', name: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus' },
  { provider: 'google', name: 'gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash' },
  { provider: 'google', name: 'gemini-exp-1206', displayName: 'Gemini Exp 1206' },
  { provider: 'google', name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
];

