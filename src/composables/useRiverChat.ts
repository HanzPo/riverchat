import { ref, computed, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { River, MessageNode, LLMModel, Settings, APIKeys } from '../types';
import { getDefaultEnabledModelsRecord, SHARED_OPENROUTER_API_KEY } from '../types';
import { FirestoreStorageService } from '../services/firestore-storage';
import { LLMAPIService } from '../services/llm-api';
import { getAvailableModels, filterModelsByApiKey, sortModels } from '../services/openrouter';

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Global state
const currentRiver = ref<River | null>(null);
const settings = ref<Settings>({ apiKeys: { openrouter: '' }, lastUsedModel: null, enabledModels: {}, lastChatSelectedModels: [], availableModels: [] });
const selectedNodeId = ref<string | null>(null);
const allRivers = ref<River[]>([]);
const hasAPIKeys = ref(false);
const isLoading = ref(false);
const isInitializing = ref(true); // Flag to prevent auto-save during initial load
const isSavingImmediately = ref(false); // Flag to skip debounced watcher during immediate saves

export function useRiverChat() {
  const selectedNode = computed(() => {
    if (!currentRiver.value || !selectedNodeId.value) return null;
    return currentRiver.value.nodes[selectedNodeId.value] || null;
  });

  // Debounced save function to reduce Firestore writes
  const debouncedSaveRiver = debounce(async (river: River) => {
    await FirestoreStorageService.saveRiver(river);
  }, 1000); // Save at most once per second

  // Debounced save for settings (reduce writes)
  const debouncedSaveSettings = debounce(async (newSettings: Settings) => {
    console.log('[useRiverChat] Auto-saving settings to Firestore (debounced)');
    await FirestoreStorageService.saveSettings(newSettings);
    hasAPIKeys.value = await FirestoreStorageService.hasAPIKeys();
  }, 2000); // Save at most once per 2 seconds

  // Save current river whenever it changes (debounced)
  watch(currentRiver, (river) => {
    if (river) {
      debouncedSaveRiver(river);
    }
  }, { deep: true });

  // Save settings whenever they change (but skip during initialization to preserve cloud data)
  watch(settings, async (newSettings) => {
    if (isInitializing.value) {
      console.log('[useRiverChat] Skipping auto-save during initialization');
      return;
    }
    if (isSavingImmediately.value) {
      console.log('[useRiverChat] Skipping debounced save - immediate save in progress');
      return;
    }
    // Use debounced save to reduce writes
    debouncedSaveSettings(newSettings);
  }, { deep: true });

  // Refresh rivers list
  async function refreshRivers(forceRefresh: boolean = false): Promise<void> {
    allRivers.value = await FirestoreStorageService.getRivers(!forceRefresh);
  }

  // River Management
  async function createRiver(name: string): Promise<River> {
    const river: River = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      nodes: {},
      rootNodeId: null,
    };

    await FirestoreStorageService.saveRiver(river);
    currentRiver.value = river;
    // Force refresh to ensure new river appears immediately
    await refreshRivers(true);
    return river;
  }

  async function loadRiver(riverId: string): Promise<boolean> {
    const river = await FirestoreStorageService.getRiver(riverId);
    if (river) {
      currentRiver.value = river;
      selectedNodeId.value = null;
      return true;
    }
    return false;
  }

  async function deleteRiver(riverId: string): Promise<void> {
    await FirestoreStorageService.deleteRiver(riverId);
    if (currentRiver.value?.id === riverId) {
      currentRiver.value = null;
      selectedNodeId.value = null;
    }
    // Force refresh to ensure deleted river is removed immediately
    await refreshRivers(true);
  }

  async function renameRiver(riverId: string, newName: string): Promise<void> {
    const river = await FirestoreStorageService.getRiver(riverId);
    if (river) {
      river.name = newName;
      river.lastModified = new Date().toISOString();
      await FirestoreStorageService.saveRiver(river);
      if (currentRiver.value?.id === riverId) {
        currentRiver.value.name = newName;
      }
      // Force refresh to bypass cache and get immediate update
      await refreshRivers(true);
    }
  }

  // Helper function to estimate node dimensions based on content
  function estimateNodeDimensions(node: MessageNode): { width: number; height: number } {
    const BASE_WIDTH = 300; // Average node width (min 280, max 320)
    const BASE_HEIGHT = 120; // Base height for header, timestamp, etc.
    const BRANCH_METADATA_HEIGHT = 80; // Extra height for branch metadata

    let estimatedHeight = BASE_HEIGHT;

    // Add height based on content length (accounting for word wrap at ~300px width)
    const contentLength = node.content.length;
    const estimatedLines = Math.ceil(contentLength / 40); // ~40 chars per line at 300px
    estimatedHeight += estimatedLines * 20; // ~20px per line

    // Add extra height for branch metadata
    if (node.branchMetadata) {
      estimatedHeight += BRANCH_METADATA_HEIGHT;
    }

    // Cap at reasonable max
    estimatedHeight = Math.min(estimatedHeight, 400);

    return { width: BASE_WIDTH, height: estimatedHeight };
  }

  // Helper function to calculate smart position for new nodes
  function calculateSmartPosition(parentId: string | null): { x: number; y: number } | undefined {
    if (!currentRiver.value) return undefined;

    const BASE_HORIZONTAL_SPACING = 80; // Minimum gap between nodes
    const BASE_VERTICAL_SPACING = 50; // Minimum gap between levels

    if (!parentId) {
      // This is a new root node - find all existing root nodes
      const rootNodes = Object.values(currentRiver.value.nodes).filter(n => !n.parentId);

      if (rootNodes.length === 0) {
        // First node ever
        return { x: 0, y: 0 };
      }

      // Find the rightmost position among all nodes and calculate spacing
      const allPositions = Object.values(currentRiver.value.nodes)
        .map(n => n.position)
        .filter(p => p !== undefined) as { x: number; y: number }[];

      if (allPositions.length === 0) {
        // No positions stored yet, use default spacing
        return { x: rootNodes.length * 500, y: 0 };
      }

      // Find the rightmost node and its dimensions
      const maxX = Math.max(...allPositions.map(p => p.x));
      const rightmostNode = Object.values(currentRiver.value.nodes).find(
        n => n.position?.x === maxX
      );

      if (rightmostNode) {
        const nodeDims = estimateNodeDimensions(rightmostNode);
        return { x: maxX + nodeDims.width + BASE_HORIZONTAL_SPACING, y: 0 };
      }

      return { x: maxX + 380, y: 0 };
    }

    // Node with a parent - position it below the parent
    const parent = currentRiver.value.nodes[parentId];
    if (!parent) return undefined;

    const parentPos = parent.position;
    if (!parentPos) {
      // Parent has no stored position, will be calculated by layout algorithm
      return undefined;
    }

    // Get parent dimensions
    const parentDims = estimateNodeDimensions(parent);

    // Find siblings (other children of the same parent)
    const siblings = Object.values(currentRiver.value.nodes)
      .filter(n => n.parentId === parentId && n.position);

    if (siblings.length === 0) {
      // First child - position directly below parent
      return {
        x: parentPos.x,
        y: parentPos.y + parentDims.height + BASE_VERTICAL_SPACING
      };
    }

    // Position to the right of existing siblings
    const siblingPositions = siblings.map(s => s.position!);
    const maxSiblingX = Math.max(...siblingPositions.map(p => p.x));

    // Find the rightmost sibling to calculate proper spacing
    const rightmostSibling = siblings.find(s => s.position?.x === maxSiblingX);
    let horizontalSpacing = 380; // Default

    if (rightmostSibling) {
      const siblingDims = estimateNodeDimensions(rightmostSibling);
      horizontalSpacing = siblingDims.width + BASE_HORIZONTAL_SPACING;
    }

    return {
      x: maxSiblingX + horizontalSpacing,
      y: parentPos.y + parentDims.height + BASE_VERTICAL_SPACING
    };
  }

  // Node Management
  function createUserNode(content: string, parentId: string | null = null): MessageNode {
    if (!currentRiver.value) {
      throw new Error('No active river');
    }

    const node: MessageNode = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: Date.now(),
      parentId,
      state: 'complete',
      position: calculateSmartPosition(parentId),
    };

    currentRiver.value.nodes[node.id] = node;

    if (!currentRiver.value.rootNodeId) {
      currentRiver.value.rootNodeId = node.id;
    }

    return node;
  }

  function createAINode(parentId: string, model: LLMModel): MessageNode {
    if (!currentRiver.value) {
      throw new Error('No active river');
    }

    const node: MessageNode = {
      id: uuidv4(),
      type: 'ai',
      content: '',
      timestamp: Date.now(),
      parentId,
      state: 'generating',
      model,
      position: calculateSmartPosition(parentId),
    };

    currentRiver.value.nodes[node.id] = node;
    return node;
  }

  async function generateAIResponse(userNodeId: string, model: LLMModel, webSearchEnabled: boolean = false): Promise<void> {
    if (!currentRiver.value) {
      throw new Error('No active river');
    }

    const userNode = currentRiver.value.nodes[userNodeId];
    if (!userNode) {
      throw new Error('User node not found');
    }

    const aiNode = createAINode(userNodeId, model);
    selectedNodeId.value = aiNode.id;

    // Update last used model
    settings.value.lastUsedModel = model;

    await LLMAPIService.streamResponse(
      model,
      userNode,
      currentRiver.value.nodes,
      settings.value.apiKeys,
      webSearchEnabled,
      (token: string) => {
        // On token received
        if (currentRiver.value) {
          const node = currentRiver.value.nodes[aiNode.id];
          if (node) {
            node.content += token;
          }
        }
      },
      () => {
        // On complete
        if (currentRiver.value) {
          const node = currentRiver.value.nodes[aiNode.id];
          if (node) {
            node.state = 'complete';
          }
        }
      },
      (error: string) => {
        // On error
        if (currentRiver.value) {
          const node = currentRiver.value.nodes[aiNode.id];
          if (node) {
            node.state = 'error';
            node.error = error;
          }
        }
      }
    );
  }

  async function branchFromText(
    sourceNodeId: string,
    highlightedText: string,
    userPrompt: string,
    model: LLMModel,
    webSearchEnabled: boolean = false
  ): Promise<void> {
    if (!currentRiver.value) {
      throw new Error('No active river');
    }

    const sourceNode = currentRiver.value.nodes[sourceNodeId];
    if (!sourceNode) {
      throw new Error('Source node not found');
    }

    // Store only the user's prompt as the content
    // The highlighted text is stored in branchMetadata
    const userNode: MessageNode = {
      id: uuidv4(),
      type: 'user',
      content: userPrompt,
      timestamp: Date.now(),
      parentId: sourceNodeId,
      state: 'complete',
      position: calculateSmartPosition(sourceNodeId),
      branchMetadata: {
        sourceNodeId,
        highlightedText,
        elaborationPrompt: userPrompt,
      },
    };

    currentRiver.value.nodes[userNode.id] = userNode;
    selectedNodeId.value = userNode.id;

    // Generate AI response for this branch
    await generateAIResponse(userNode.id, model, webSearchEnabled);
  }

  function deleteNode(nodeId: string): void {
    if (!currentRiver.value) return;

    const nodesToDelete = new Set<string>();
    const queue = [nodeId];

    // Find all descendants
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      nodesToDelete.add(currentId);

      // Find children
      Object.values(currentRiver.value.nodes).forEach((node) => {
        if (node.parentId === currentId) {
          queue.push(node.id);
        }
      });
    }

    // Delete all nodes
    nodesToDelete.forEach((id) => {
      delete currentRiver.value!.nodes[id];
    });

    // Clear selection if deleted
    if (selectedNodeId.value && nodesToDelete.has(selectedNodeId.value)) {
      selectedNodeId.value = null;
    }

    // Clear root if deleted
    if (currentRiver.value.rootNodeId && nodesToDelete.has(currentRiver.value.rootNodeId)) {
      currentRiver.value.rootNodeId = null;
    }
  }

  function updateNodeContent(nodeId: string, content: string): void {
    if (!currentRiver.value) return;
    const node = currentRiver.value.nodes[nodeId];
    if (node) {
      node.content = content;
    }
  }

  function updateNodePosition(nodeId: string, position: { x: number; y: number }): void {
    if (!currentRiver.value) return;
    const node = currentRiver.value.nodes[nodeId];
    if (node) {
      node.position = position;
    }
  }

  function updateNodePositionsBatch(updates: Array<{ nodeId: string; position: { x: number; y: number } }>): void {
    if (!currentRiver.value) return;
    // Update all positions in a single operation to minimize reactivity triggers
    updates.forEach(({ nodeId, position }) => {
      const node = currentRiver.value!.nodes[nodeId];
      if (node) {
        node.position = position;
      }
    });
  }

  function getPathToNode(nodeId: string): MessageNode[] {
    if (!currentRiver.value) return [];

    const path: MessageNode[] = [];
    let currentNode: MessageNode | undefined = currentRiver.value.nodes[nodeId];

    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parentId
        ? currentRiver.value.nodes[currentNode.parentId]
        : undefined;
    }

    return path;
  }

  function getChildren(nodeId: string): MessageNode[] {
    if (!currentRiver.value) return [];

    return Object.values(currentRiver.value.nodes).filter(
      (node) => node.parentId === nodeId
    );
  }

  // Settings Management
  async function updateSettings(newSettings: Partial<Settings>, immediate: boolean = false): Promise<void> {
    console.log('[useRiverChat] updateSettings called with:', {
      hasAPIKeys: !!newSettings.apiKeys?.openrouter,
      apiKeys: newSettings.apiKeys ? {
        openrouter: newSettings.apiKeys.openrouter ? `${newSettings.apiKeys.openrouter.substring(0, 10)}...` : 'empty'
      } : 'no apiKeys property',
      immediate,
      newSettings
    });

    // Set flag to skip debounced watcher if this is an immediate save
    // Must be set BEFORE updating settings.value to ensure watcher sees it
    if (immediate) {
      isSavingImmediately.value = true;
    }

    // Merge new settings into current settings
    const mergedSettings = { ...settings.value, ...newSettings };
    settings.value = mergedSettings;

    console.log('[useRiverChat] After merge, settings.value.apiKeys:', {
      openrouter: settings.value.apiKeys.openrouter ? `${settings.value.apiKeys.openrouter.substring(0, 10)}...` : 'empty'
    });

    // Save immediately (bypasses debounced watcher)
    await FirestoreStorageService.saveSettings(mergedSettings);
    
    // Reset flag after save completes
    if (immediate) {
      // Small delay to ensure watcher has processed the skip
      await new Promise(resolve => setTimeout(resolve, 10));
      isSavingImmediately.value = false;
    }
  }

  async function updateAPIKeys(apiKeys: APIKeys): Promise<void> {
    settings.value.apiKeys = apiKeys;
    await FirestoreStorageService.saveAPIKeys(apiKeys);
    hasAPIKeys.value = await FirestoreStorageService.hasAPIKeys();
  }

  // Selection
  function selectNode(nodeId: string | null): void {
    selectedNodeId.value = nodeId;
  }

  // Clear all state (for logout)
  function clearState(): void {
    currentRiver.value = null;
    selectedNodeId.value = null;
  }

  // Initialize - optimized with caching
  async function initialize(forceRefresh: boolean = false): Promise<void> {
    isLoading.value = true;
    isInitializing.value = true; // Prevent auto-save during load
    try {
      // Load settings from cache first for instant UI, then sync in background
      console.log('[useRiverChat] Loading settings from storage...');
      settings.value = await FirestoreStorageService.getSettings(!forceRefresh);
      console.log('[useRiverChat] Settings loaded successfully');

      // Check API keys
      hasAPIKeys.value = await FirestoreStorageService.hasAPIKeys();

      // Use cached models if available, fetch only on first initialization
      if (settings.value.availableModels && settings.value.availableModels.length > 0) {
        console.log(`[useRiverChat] Using ${settings.value.availableModels.length} cached models`);
      } else {
        // First time user - fetch models once
        console.log('[useRiverChat] No cached models found. Fetching models for first-time initialization...');
        try {
          const allModels = await getAvailableModels();
          const apiKey = settings.value.apiKeys.openrouter || SHARED_OPENROUTER_API_KEY;
          const filteredModels = filterModelsByApiKey(allModels, apiKey);
          const sortedModels = sortModels(filteredModels);

          settings.value.availableModels = sortedModels;
          settings.value.lastModelRefresh = Date.now();

          // Enable default models
          if (!settings.value.enabledModels || Object.keys(settings.value.enabledModels).length === 0) {
            settings.value.enabledModels = getDefaultEnabledModelsRecord(sortedModels);
          }

          await FirestoreStorageService.saveSettings(settings.value);
          console.log(`[useRiverChat] Fetched and cached ${sortedModels.length} models for first-time use`);
        } catch (error) {
          console.error('[useRiverChat] Failed to fetch models:', error);
          console.log('[useRiverChat] Please refresh model list from Settings > Data.');
        }
      }

      // Load rivers
      await refreshRivers();

      // Load the most recent river if available
      if (allRivers.value && allRivers.value.length > 0 && allRivers.value[0]) {
        await loadRiver(allRivers.value[0].id);
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      isLoading.value = false;
      // Enable auto-save after initialization complete
      isInitializing.value = false;
      console.log('[useRiverChat] Initialization complete, auto-save enabled');
    }
  }

  return {
    // State
    currentRiver,
    settings,
    selectedNodeId,
    allRivers,
    hasAPIKeys,
    isLoading,

    // Computed
    selectedNode,

    // River methods
    createRiver,
    loadRiver,
    deleteRiver,
    renameRiver,
    refreshRivers,

    // Node methods
    createUserNode,
    generateAIResponse,
    branchFromText,
    deleteNode,
    updateNodeContent,
    updateNodePosition,
    updateNodePositionsBatch,
    getPathToNode,
    getChildren,

    // Settings methods
    updateSettings,
    updateAPIKeys,

    // Selection methods
    selectNode,

    // State management
    clearState,

    // Initialization
    initialize,
  };
}
