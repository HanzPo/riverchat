import { ref, computed, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { River, MessageNode, LLMModel, Settings } from '../types';
import { StorageService } from '../services/storage';
import { LLMAPIService } from '../services/llm-api';

// Global state
const currentRiver = ref<River | null>(null);
const settings = ref<Settings>(StorageService.getSettings());
const selectedNodeId = ref<string | null>(null);

export function useRiverChat() {
  // Computed
  const allRivers = computed(() => StorageService.getRivers());
  
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
  }

  function renameRiver(riverId: string, newName: string): void {
    const river = StorageService.getRiver(riverId);
    if (river) {
      river.name = newName;
      StorageService.saveRiver(river);
      if (currentRiver.value?.id === riverId) {
        currentRiver.value.name = newName;
      }
    }
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
    deleteNode,
    updateNodeContent,
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

