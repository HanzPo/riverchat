import { ref, computed, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { River, MessageNode, LLMModel, Settings } from '../types';
import { StorageService } from '../services/storage';
import { LLMAPIService } from '../services/llm-api';

// Global state
const currentRiver = ref<River | null>(null);
const settings = ref<Settings>(StorageService.getSettings());
const selectedNodeId = ref<string | null>(null);
const riversUpdateTrigger = ref(0); // Trigger to force re-computation of rivers list

export function useRiverChat() {
  // Computed
  const allRivers = computed(() => {
    void riversUpdateTrigger.value; // Force reactivity
    return StorageService.getRivers();
  });
  
  const selectedNode = computed(() => {
    if (!currentRiver.value || !selectedNodeId.value) return null;
    return currentRiver.value.nodes[selectedNodeId.value] || null;
  });

  const hasAPIKeys = computed(() => StorageService.hasAPIKeys());

  // Save current river whenever it changes
  watch(currentRiver, (river) => {
    if (river) {
      StorageService.saveRiver(river);
      StorageService.setActiveRiverId(river.id);
    }
  }, { deep: true });

  // Save settings whenever they change
  watch(settings, (newSettings) => {
    StorageService.saveSettings(newSettings);
  }, { deep: true });

  // River Management
  function createRiver(name: string): River {
    const river: River = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      nodes: {},
      rootNodeId: null,
    };
    
    StorageService.saveRiver(river);
    currentRiver.value = river;
    riversUpdateTrigger.value++; // Trigger rivers list update
    return river;
  }

  function loadRiver(riverId: string): boolean {
    const river = StorageService.getRiver(riverId);
    if (river) {
      currentRiver.value = river;
      selectedNodeId.value = null;
      return true;
    }
    return false;
  }

  function deleteRiver(riverId: string): void {
    StorageService.deleteRiver(riverId);
    if (currentRiver.value?.id === riverId) {
      currentRiver.value = null;
      selectedNodeId.value = null;
    }
    riversUpdateTrigger.value++; // Trigger rivers list update
  }

  function renameRiver(riverId: string, newName: string): void {
    const river = StorageService.getRiver(riverId);
    if (river) {
      river.name = newName;
      river.lastModified = new Date().toISOString();
      StorageService.saveRiver(river);
      if (currentRiver.value?.id === riverId) {
        currentRiver.value.name = newName;
      }
      riversUpdateTrigger.value++; // Trigger rivers list update
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

  async function generateAIResponse(userNodeId: string, model: LLMModel): Promise<void> {
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
    model: LLMModel
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
    await generateAIResponse(userNode.id, model);
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
  function updateSettings(newSettings: Partial<Settings>): void {
    settings.value = { ...settings.value, ...newSettings };
  }

  function updateAPIKeys(apiKeys: Partial<typeof settings.value.apiKeys>): void {
    settings.value.apiKeys = { ...settings.value.apiKeys, ...apiKeys };
  }

  // Selection
  function selectNode(nodeId: string | null): void {
    selectedNodeId.value = nodeId;
  }

  // Initialize
  function initialize(): void {
    const activeRiverId = StorageService.getActiveRiverId();
    if (activeRiverId) {
      loadRiver(activeRiverId);
    }
  }

  return {
    // State
    currentRiver,
    settings,
    selectedNodeId,
    
    // Computed
    allRivers,
    selectedNode,
    hasAPIKeys,

    // River methods
    createRiver,
    loadRiver,
    deleteRiver,
    renameRiver,

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

    // Initialization
    initialize,
  };
}

