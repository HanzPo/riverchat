<template>
  <div class="w-screen h-screen overflow-hidden bg-background">
    <!-- Top Navigation Bar -->
    <div class="flex justify-between items-center px-5 py-3.5 border-b border-white/15 card-material">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold text-white/95">
          🌊 RiverChat
        </h1>
        <span v-if="currentRiver" class="text-white/75 text-sm font-medium">
          {{ currentRiver.name }}
        </span>
      </div>

      <div class="flex gap-3">
        <button @click="showRiverDashboard = true" class="btn-material" title="Manage Rivers">
          📂 Rivers
        </button>
        <button @click="handleSearch" class="btn-material" title="Search (Ctrl+F)">
          🔍
        </button>
        <button @click="showSettings = true" class="btn-material" title="Settings">
          ⚙️
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex h-[calc(100vh-60px)]">
      <!-- Left Panel: Graph Canvas -->
      <div class="flex-1 relative overflow-hidden">
        <GraphCanvas
          v-if="currentRiver"
          :nodes="currentRiver.nodes"
          :root-node-id="currentRiver.rootNodeId"
          :selected-node-id="selectedNodeId"
          @node-select="selectNode"
          @node-double-click="handleNodeDoubleClick"
          @branch-from="handleBranchFrom"
          @regenerate="handleRegenerate"
          @edit-resubmit="handleEditResubmit"
          @delete-branch="handleDeleteBranch"
          @update-position="handleUpdatePosition"
          @copy-message="handleCopyMessage"
        />
        <div v-else class="flex items-center justify-center h-full bg-background-paper">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-white/95 mb-3">
              Welcome to RiverChat
            </h2>
            <p class="text-white/75 text-base mb-6 font-medium">
              Create a new river to start your first conversation
            </p>
            <button @click="handleCreateFirstRiver" class="btn-material px-6 py-3 text-base font-bold">
              + Create River
            </button>
          </div>
        </div>
      </div>

      <!-- Right Panel: Chat History -->
      <div class="w-[400px] border-l border-white/15 flex flex-col card-material">
        <ChatHistory
          :path="currentPath"
          :selected-node-id="selectedNodeId"
          :last-used-model="settings.lastUsedModel"
          @send="handleSendMessage"
          @node-select="selectNode"
        />
      </div>
    </div>

    <!-- Modals -->
    <WelcomeModal
      :is-open="showWelcome"
      :can-dismiss="false"
      @save="handleSaveAPIKeys"
    />

    <SettingsModal
      :is-open="showSettings"
      :settings="settings"
      @save="handleSaveSettings"
      @close="showSettings = false"
    />

    <RiverDashboard
      :is-open="showRiverDashboard"
      :rivers="allRivers"
      :active-river-id="currentRiver?.id || null"
      @create="handleCreateRiver"
      @open="handleOpenRiver"
      @rename="handleRenameRiver"
      @delete="handleDeleteRiver"
      @close="showRiverDashboard = false"
    />

    <MessageViewerModal
      :is-open="showMessageViewer"
      :message="viewingMessage"
      @close="showMessageViewer = false"
    />

    <ConfirmationModal
      :is-open="deleteConfirmation.isOpen"
      title="Delete Branch?"
      message="Are you sure you want to delete this branch? All messages in this branch and its children will be permanently deleted."
      confirm-text="Delete"
      cancel-text="Cancel"
      :is-dangerous="true"
      @confirm="confirmDeleteBranch"
      @close="deleteConfirmation.isOpen = false"
    />

    <ConfirmationModal
      :is-open="editConfirmation.isOpen"
      title="Edit and Resubmit?"
      message="Editing this message will delete all responses below it. Are you sure you want to continue?"
      confirm-text="Edit"
      cancel-text="Cancel"
      :is-dangerous="true"
      @confirm="confirmEditResubmit"
      @close="editConfirmation.isOpen = false"
    />

    <!-- Toast Notification -->
    <div v-if="toast.visible" class="toast" :class="`toast-${toast.type}`">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRiverChat } from './composables/useRiverChat';
import type { MessageNode, LLMModel } from './types';

import GraphCanvas from './components/GraphCanvas.vue';
import ChatHistory from './components/ChatHistory.vue';
import WelcomeModal from './components/WelcomeModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import RiverDashboard from './components/RiverDashboard.vue';
import MessageViewerModal from './components/MessageViewerModal.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';

const {
  currentRiver,
  settings,
  selectedNodeId,
  allRivers,
  hasAPIKeys,
  createRiver,
  loadRiver,
  deleteRiver,
  renameRiver,
  createUserNode,
  generateAIResponse,
  deleteNode,
  updateNodeContent,
  updateNodePosition,
  getPathToNode,
  updateSettings,
  updateAPIKeys,
  selectNode,
  initialize,
} = useRiverChat();

// Modal states
const showWelcome = ref(false);
const showSettings = ref(false);
const showRiverDashboard = ref(false);
const showMessageViewer = ref(false);
const viewingMessage = ref<MessageNode | null>(null);

// Confirmation dialogs
const deleteConfirmation = ref({
  isOpen: false,
  nodeId: '',
});

const editConfirmation = ref({
  isOpen: false,
  nodeId: '',
});

// Toast notifications
const toast = ref({
  visible: false,
  message: '',
  type: 'info' as 'info' | 'success' | 'error',
});

// Current conversation path
const currentPath = computed(() => {
  if (!selectedNodeId.value) return [];
  return getPathToNode(selectedNodeId.value);
});

// Initialize app
onMounted(() => {
  initialize();
  
  // Show welcome modal if no API keys
  if (!hasAPIKeys.value) {
    showWelcome.value = true;
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Set dark theme on body
  document.body.className = 'dark-theme';
});

// API Keys Management
function handleSaveAPIKeys(apiKeys: typeof settings.value.apiKeys) {
  updateAPIKeys(apiKeys);
  showWelcome.value = false;
  showToast('API keys saved successfully', 'success');
  
  // Create first river if none exists
  if (allRivers.value.length === 0) {
    handleCreateFirstRiver();
  }
}

// Settings Management
function handleSaveSettings(newSettings: typeof settings.value) {
  updateSettings(newSettings);
  showSettings.value = false;
  showToast('Settings saved', 'success');
}

// River Management
function handleCreateFirstRiver() {
  const river = createRiver('My First River');
  showToast(`Created "${river.name}"`, 'success');
}

function handleCreateRiver(name: string) {
  const river = createRiver(name);
  showToast(`Created "${river.name}"`, 'success');
}

function handleOpenRiver(riverId: string) {
  if (loadRiver(riverId)) {
    showToast('River loaded', 'success');
  }
}

function handleRenameRiver(riverId: string, newName: string) {
  renameRiver(riverId, newName);
  showToast('River renamed', 'success');
}

function handleDeleteRiver(riverId: string) {
  const river = allRivers.value.find((r) => r.id === riverId);
  deleteRiver(riverId);
  showToast(`Deleted "${river?.name}"`, 'success');
}

// Message Handling
async function handleSendMessage(content: string, model: LLMModel) {
  if (!currentRiver.value) {
    handleCreateFirstRiver();
    // Wait a tick for river to be created
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  try {
    // Get the last node in current path (or null for new conversation)
    const parentId = currentPath.value.length > 0 
      ? currentPath.value[currentPath.value.length - 1]?.id || null
      : null;

    // Create user node
    const userNode = createUserNode(content, parentId);
    selectNode(userNode.id);

    // Generate AI response
    await generateAIResponse(userNode.id, model);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to send message', 'error');
  }
}

// Node Interactions
function handleNodeDoubleClick(node: MessageNode) {
  viewingMessage.value = node;
  showMessageViewer.value = true;
}

async function handleBranchFrom(nodeId: string) {
  selectNode(nodeId);
  showToast('Branch from this node by sending a new message', 'info');
}

async function handleRegenerate(parentNodeId: string) {
  if (!currentRiver.value) return;

  const parentNode = currentRiver.value.nodes[parentNodeId];
  if (!parentNode) return;

  // Use the last used model or default
  const model = settings.value.lastUsedModel || {
    provider: 'openai' as const,
    name: 'gpt-4o',
    displayName: 'GPT-4o',
  };

  try {
    await generateAIResponse(parentNodeId, model);
    showToast('Generating new response...', 'info');
  } catch (error) {
    showToast('Failed to regenerate response', 'error');
  }
}

function handleEditResubmit(nodeId: string) {
  editConfirmation.value = {
    isOpen: true,
    nodeId,
  };
}

function confirmEditResubmit() {
  const nodeId = editConfirmation.value.nodeId;
  if (!currentRiver.value || !nodeId) return;

  const node = currentRiver.value.nodes[nodeId];
  if (!node) return;

  // Get new content from user
  const newContent = prompt('Edit your message:', node.content);
  if (newContent && newContent.trim() && newContent !== node.content) {
    // Delete all children first
    const children = Object.values(currentRiver.value.nodes).filter(
      (n) => n.parentId === nodeId
    );
    children.forEach((child) => deleteNode(child.id));

    // Update node content
    updateNodeContent(nodeId, newContent.trim());

    // Generate new response
    const model = settings.value.lastUsedModel || {
      provider: 'openai' as const,
      name: 'gpt-4o',
      displayName: 'GPT-4o',
    };
    generateAIResponse(nodeId, model);
    
    showToast('Message updated, generating new response...', 'info');
  }
}

function handleDeleteBranch(nodeId: string) {
  deleteConfirmation.value = {
    isOpen: true,
    nodeId,
  };
}

function confirmDeleteBranch() {
  const nodeId = deleteConfirmation.value.nodeId;
  if (nodeId) {
    deleteNode(nodeId);
    showToast('Branch deleted', 'success');
  }
}

function handleCopyMessage(content: string) {
  navigator.clipboard.writeText(content);
  showToast('Message copied to clipboard', 'success');
}

function handleUpdatePosition(nodeId: string, position: { x: number; y: number }) {
  updateNodePosition(nodeId, position);
}

function handleSearch() {
  showToast('Search functionality coming soon!', 'info');
}

// Toast
function showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
  toast.value = { visible: true, message, type };
  setTimeout(() => {
    toast.value.visible = false;
  }, 3000);
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Open rivers dashboard
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      showRiverDashboard.value = true;
    }

    // Ctrl/Cmd + ,: Open settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      showSettings.value = true;
    }

    // Ctrl/Cmd + F: Search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      handleSearch();
    }

    // Escape: Close modals
    if (e.key === 'Escape') {
      showSettings.value = false;
      showRiverDashboard.value = false;
      showMessageViewer.value = false;
    }
  });
}
</script>

<style>
@media (max-width: 1024px) {
  .w-\[400px\] {
    width: 350px;
  }
}

@media (max-width: 768px) {
  .flex.h-\[calc\(100vh-60px\)\] {
    flex-direction: column;
  }

  .w-\[400px\] {
    width: 100%;
    height: 40vh;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }

  .flex-1.relative.overflow-hidden {
    height: 60vh;
  }
}
</style>
