<template>
  <div class="w-screen h-screen overflow-hidden relative" style="background: var(--color-background);">
    <!-- Floating App Title and Navigation (Top Left) -->
    <div v-if="!showSettings" class="fixed top-4 left-4 z-50 flex flex-col gap-2">
      <!-- Logo and River Name -->
      <div class="flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg" style="background: var(--color-background-secondary); border: 1px solid var(--color-border);">
        <h1 class="text-sm font-semibold" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
          🌊 RiverChat
        </h1>
        <span v-if="currentRiver" class="text-xs font-medium px-2 py-0.5 rounded-md" style="color: var(--color-text-secondary); background: var(--color-background); border: 1px solid var(--color-border);">
          {{ currentRiver.name }}
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2">
        <button @click="handleShowRiverDashboard" class="btn-material text-xs flex items-center gap-1.5 px-3 py-2" title="Manage Rivers (Ctrl+K)">
          <Folder :size="14" />
          <span>Rivers</span>
        </button>
        <button @click="handleSearch" class="btn-material p-2" title="Search (Ctrl+F)">
          <Search :size="14" />
        </button>
        <button @click="showHelp = true" class="btn-material p-2" title="Keyboard Shortcuts (Ctrl+?)">
          <HelpCircle :size="14" />
        </button>
        <button @click="showSettings = true" class="btn-material p-2" title="Settings (Ctrl+,)">
          <Settings :size="14" />
        </button>

        <!-- Auth button - only show if not signed in or if signing in -->
        <button
          v-if="!currentUser || isAuthenticating"
          @click="!isAuthenticating ? showAuth = true : null"
          class="btn-material text-xs flex items-center gap-1.5 px-3 py-2"
          :class="{ 'opacity-60 cursor-wait': isAuthenticating }"
          :disabled="isAuthenticating"
          :title="isAuthenticating ? 'Signing in...' : 'Sign In'"
        >
          <UserIcon :size="14" />
          <span>{{ isAuthenticating ? 'Signing in...' : 'Sign In' }}</span>
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex h-screen">
      <!-- Left Panel: Graph Canvas -->
      <div class="flex-1 relative overflow-hidden">
        <GraphCanvas
          ref="graphCanvas"
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
          @delete-branches-batch="handleDeleteBranchesBatch"
          @update-position="handleUpdatePosition"
          @update-positions-batch="handleUpdatePositionsBatch"
          @copy-message="handleCopyMessage"
          @create-root-node="handleCreateRootNode"
          @pane-click="handlePaneClick"
          @selection-change="handleSelectionChange"
        />
        
        <!-- New Root Node Button (Floating - top right, shifts left with chat panel) -->
        <button
          v-if="currentRiver && !selectedNodeId && !isNewRootMode && !hasMultipleNodesSelected && !showSettings"
          @click="handleCreateRootNode"
          class="fixed top-4 z-50 btn-material px-5 py-2.5 text-sm font-bold flex items-center gap-2 shadow-elevation-3"
          :style="{ right: (selectedNodeId || isNewRootMode) && !hasMultipleNodesSelected ? `${chatPanelWidth + 16}px` : '16px' }"
        >
          <Plus :size="16" />
          <span>New Root Node</span>
        </button>
        
        <div v-if="!currentRiver" class="flex items-center justify-center h-full" style="background: var(--color-background);">
          <div class="text-center">
            <h2 class="text-2xl font-semibold mb-3" style="color: var(--color-text-primary); letter-spacing: -0.02em;">
              Welcome to RiverChat
            </h2>
            <p class="text-sm mb-6 font-medium" style="color: var(--color-text-secondary);">
              Create a new river to start your first conversation
            </p>
            <button @click="handleCreateFirstRiver" class="btn-material" style="padding: 10px 20px; font-size: 14px; font-weight: 600;">
              + Create River
            </button>
          </div>
        </div>
      </div>

      <!-- Right Panel: Chat History -->
      <div 
        ref="chatPanel"
        v-if="(selectedNodeId || isNewRootMode) && !hasMultipleNodesSelected" 
        class="flex flex-col relative"
        :style="{ 
          width: `${chatPanelWidth}px`, 
          borderLeft: '1px solid var(--color-border)',
          background: 'var(--color-background-secondary)'
        }"
      >
        <!-- Resize Handle -->
        <div 
          class="resize-handle"
          @mousedown="startResize"
        ></div>
        
        <ChatHistory
          :path="currentPath"
          :selected-node-id="selectedNodeId"
          :last-used-model="settings.lastUsedModel"
          :is-new-root-mode="isNewRootMode"
          :all-nodes="currentRiver?.nodes || {}"
          :api-keys="settings.apiKeys"
          :settings="settings"
          :is-sending="isSendingMessage"
          :current-user="currentUser"
          @send="handleSendMessage"
          @resend="handleResend"
          @node-select="selectNode"
          @branch-from-text="handleBranchFromText"
          @chat-model-changed="handleChatModelChanged"
          @close="handleCloseChatPanel"
          @pop-out="handlePopOutChat"
        />
      </div>
    </div>

    <!-- Modals -->
    <WelcomeModal
      :is-open="showWelcome"
      :can-dismiss="true"
      @save="handleSaveAPIKeys"
      @close="showWelcome = false"
    />

    <SettingsPage
      v-if="showSettings"
      :settings="settings"
      :current-user="currentUser"
      :is-authenticating="isAuthenticating"
      @save="handleSaveSettings"
      @close="showSettings = false"
      @logout="handleLogout"
    />

    <RiverDashboard
      :is-open="showRiverDashboard"
      :rivers="allRivers || []"
      :active-river-id="currentRiver?.id || null"
      :is-loading="isRiverOperationLoading"
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

    <ConfirmationModal
      :is-open="deleteBatchConfirmation.isOpen"
      title="Delete Multiple Nodes?"
      :message="`Are you sure you want to delete ${deleteBatchConfirmation.nodeIds.length} selected nodes? All messages in these branches and their children will be permanently deleted.`"
      confirm-text="Delete All"
      cancel-text="Cancel"
      :is-dangerous="true"
      @confirm="confirmDeleteBranchesBatch"
      @close="deleteBatchConfirmation.isOpen = false"
    />

    <KeyboardShortcutsModal
      :is-open="showHelp"
      @close="showHelp = false"
    />

    <ChatModal
      :is-open="showChatModal"
      :path="currentPath"
      :selected-node-id="selectedNodeId"
      :last-used-model="settings.lastUsedModel"
      :is-new-root-mode="isNewRootMode"
      :all-nodes="currentRiver?.nodes || {}"
      :api-keys="settings.apiKeys"
      :settings="settings"
      :is-sending="isSendingMessage"
      :current-user="currentUser"
      @send="handleSendMessage"
      @resend="handleResend"
      @node-select="selectNode"
      @branch-from-text="handleBranchFromText"
      @chat-model-changed="handleChatModelChanged"
      @close="showChatModal = false"
    />

    <!-- Auth Modal -->
    <AuthModal
      :is-open="showAuth"
      @close="showAuth = false"
      @authenticated="handleAuthenticated"
    />

    <!-- Toast Notification -->
    <div v-if="toast.visible && !showSettings" class="toast" :class="`toast-${toast.type}`">
      {{ toast.message }}
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, defineAsyncComponent } from 'vue';
import { useRiverChat } from './composables/useRiverChat';
import type { MessageNode, LLMModel } from './types';
import { Folder, Search, HelpCircle, Settings, Plus, User as UserIcon } from 'lucide-vue-next';
import { AuthService } from './services/auth';
import type { User } from 'firebase/auth';

// Critical components loaded immediately
import GraphCanvas from './components/GraphCanvas.vue';
import ChatHistory from './components/ChatHistory.vue';

// Non-critical components lazy loaded
const ChatModal = defineAsyncComponent(() => import('./components/ChatModal.vue'));
const WelcomeModal = defineAsyncComponent(() => import('./components/WelcomeModal.vue'));
const SettingsPage = defineAsyncComponent(() => import('./components/SettingsPage.vue'));
const RiverDashboard = defineAsyncComponent(() => import('./components/RiverDashboard.vue'));
const MessageViewerModal = defineAsyncComponent(() => import('./components/MessageViewerModal.vue'));
const ConfirmationModal = defineAsyncComponent(() => import('./components/ConfirmationModal.vue'));
const KeyboardShortcutsModal = defineAsyncComponent(() => import('./components/KeyboardShortcutsModal.vue'));
const AuthModal = defineAsyncComponent(() => import('./components/AuthModal.vue'));

const {
  currentRiver,
  settings,
  selectedNodeId,
  allRivers,
  hasAPIKeys,
  isLoading,
  createRiver,
  loadRiver,
  deleteRiver,
  renameRiver,
  refreshRivers,
  createUserNode,
  generateAIResponse,
  branchFromText,
  deleteNode,
  updateNodeContent,
  updateNodePosition,
  updateNodePositionsBatch,
  getPathToNode,
  updateSettings,
  updateAPIKeys,
  selectNode,
  clearState,
  initialize,
} = useRiverChat();

// Modal states
const showWelcome = ref(false);
const showSettings = ref(false);
const showRiverDashboard = ref(false);
const showMessageViewer = ref(false);
const showHelp = ref(false);
const showChatModal = ref(false);
const showAuth = ref(false);
const viewingMessage = ref<MessageNode | null>(null);
const isNewRootMode = ref(false);
const hasMultipleNodesSelected = ref(false);

// Authentication state
const currentUser = ref<User | null>(null);
const isAuthenticating = ref(false);

// Local loading states for specific operations
const isSendingMessage = ref(false);
const isRiverOperationLoading = ref(false);

// Resizable chat panel
const chatPanelWidth = ref(400);
const chatPanel = ref<HTMLElement | null>(null);
const graphCanvas = ref<any>(null);

// Confirmation dialogs
const deleteConfirmation = ref({
  isOpen: false,
  nodeId: '',
});

const deleteBatchConfirmation = ref({
  isOpen: false,
  nodeIds: [] as string[],
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

// Update page title when river changes
watch(currentRiver, (river) => {
  if (river) {
    document.title = `RiverChat - ${river.name}`;
  } else {
    document.title = 'RiverChat | Branching AI Conversations';
  }
}, { immediate: true });

// Resize functionality
function startResize(e: MouseEvent) {
  e.preventDefault();
  if (!chatPanel.value) return;
  
  // Add styles to prevent text selection and improve performance during drag
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  
  const panelElement = chatPanel.value;
  
  const onMouseMove = (moveEvent: MouseEvent) => {
    // Calculate new width from right edge
    const newWidth = window.innerWidth - moveEvent.clientX;
    
    // Clamp between min and max widths
    const clampedWidth = Math.max(300, Math.min(800, newWidth));
    
    // Use direct DOM manipulation for instant response
    panelElement.style.width = `${clampedWidth}px`;
    
    // Also update reactive state so floating buttons move in real-time
    chatPanelWidth.value = clampedWidth;
  };
  
  const onMouseUp = () => {
    // Restore body styles
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Now update the reactive state once at the end
    const finalWidth = parseInt(panelElement.style.width, 10);
    chatPanelWidth.value = finalWidth;
    
    // Save to session storage
    sessionStorage.setItem('chatPanelWidth', finalWidth.toString());
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

// Initialize app
onMounted(async () => {
  // Check for cached auth state for optimistic rendering
  const cachedAuth = AuthService.getCachedAuthState();
  if (cachedAuth) {
    console.log('[App] Found cached auth state, using optimistically');
    // Set optimistic user state (will be confirmed by Firebase Auth)
    currentUser.value = {
      uid: cachedAuth.uid,
      email: cachedAuth.email,
      displayName: cachedAuth.displayName,
    } as any;
  }

  // Initialize the app with cached data
  await initialize();

  // Listen to authentication state changes
  let isFirstAuthCheck = true;
  AuthService.onAuthStateChanged(async (user) => {
    const wasLoggedIn = !!currentUser.value;
    currentUser.value = user;

    if (user) {
      console.log('User authenticated:', user.email);

      // Only reinitialize if this is not the first check (avoiding double initialization)
      // or if user state changed (e.g., from logged out to logged in)
      if (!isFirstAuthCheck && !wasLoggedIn) {
        // Clear chat selection on login to avoid stale models
        settings.value.lastChatSelectedModels = [];

        // User just logged in - reload data from Firestore with force refresh
        await initialize(true);
      } else {
        console.log('[App] User already initialized, skipping re-initialization');
      }
    } else {
      console.log('User signed out - using localStorage');
      // User is signed out - will use localStorage fallback
      if (wasLoggedIn) {
        // User just logged out, reinitialize with local data
        await initialize();
      }
    }

    isFirstAuthCheck = false;
  });

  // Load saved chat panel width from session storage
  const savedWidth = sessionStorage.getItem('chatPanelWidth');
  if (savedWidth) {
    chatPanelWidth.value = parseInt(savedWidth, 10);
  }

  // Show welcome modal only for brand new users (no API keys, no rivers, not logged in)
  if (!hasAPIKeys.value && !currentUser.value && allRivers.value.length === 0) {
    showWelcome.value = true;
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Set dark theme on body
  document.body.className = 'dark-theme';
});

// Authentication handlers
async function handleAuthenticated() {
  // User just logged in/registered
  isAuthenticating.value = true;
  showAuth.value = false; // Close the auth modal

  try {
    // Reload data from Firestore with force refresh
    await initialize(true);
    showToast('Successfully signed in!', 'success');
  } catch (error) {
    console.error('Error loading user data:', error);
    showToast('Failed to load your data', 'error');
  } finally {
    isAuthenticating.value = false;
  }
}

async function handleLogout() {
  try {
    isAuthenticating.value = true;
    await AuthService.logout();

    // Clear local state
    clearState();

    showToast('Signed out successfully', 'success');

    // Reload app to use localStorage fallback
    setTimeout(() => {
      window.location.reload();
    }, 500);
  } catch (error) {
    console.error('Logout error:', error);
    showToast('Failed to sign out', 'error');
  } finally {
    isAuthenticating.value = false;
  }
}

// API Keys Management
async function handleSaveAPIKeys(apiKeys: typeof settings.value.apiKeys) {
  await updateAPIKeys(apiKeys);
  showWelcome.value = false;
  showToast('API keys saved successfully', 'success');
}

// Settings Management
async function handleSaveSettings(newSettings: typeof settings.value) {
  console.log('[App.vue] handleSaveSettings received:', {
    hasAPIKeys: !!newSettings.apiKeys.openrouter,
    apiKeys: {
      openrouter: newSettings.apiKeys.openrouter ? `${newSettings.apiKeys.openrouter.substring(0, 10)}...` : 'empty'
    }
  });

  await updateSettings(newSettings);
  showSettings.value = false;
  showToast('Settings saved', 'success');
}

// River Management
async function handleShowRiverDashboard() {
  // Refresh rivers to get latest node counts
  await refreshRivers(true);
  showRiverDashboard.value = true;
}

async function handleCreateFirstRiver() {
  isRiverOperationLoading.value = true;
  try {
    const river = await createRiver('My First River');
    showToast(`Created "${river.name}"`, 'success');
  } catch (error) {
    showToast('Failed to create river', 'error');
  } finally {
    isRiverOperationLoading.value = false;
  }
}

async function handleCreateRiver(name: string) {
  isRiverOperationLoading.value = true;
  try {
    const river = await createRiver(name);
    showToast(`Created "${river.name}"`, 'success');
  } catch (error) {
    showToast('Failed to create river', 'error');
  } finally {
    isRiverOperationLoading.value = false;
  }
}

async function handleOpenRiver(riverId: string) {
  isRiverOperationLoading.value = true;
  try {
    if (await loadRiver(riverId)) {
      showToast('River loaded', 'success');
    }
  } catch (error) {
    showToast('Failed to load river', 'error');
  } finally {
    isRiverOperationLoading.value = false;
  }
}

async function handleRenameRiver(riverId: string, newName: string) {
  isRiverOperationLoading.value = true;
  try {
    await renameRiver(riverId, newName);
    showToast('River renamed', 'success');
  } catch (error) {
    showToast('Failed to rename river', 'error');
  } finally {
    isRiverOperationLoading.value = false;
  }
}

async function handleDeleteRiver(riverId: string) {
  isRiverOperationLoading.value = true;
  try {
    const river = allRivers.value.find((r) => r.id === riverId);
    await deleteRiver(riverId);
    showToast(`Deleted "${river?.name}"`, 'success');
  } catch (error) {
    showToast('Failed to delete river', 'error');
  } finally {
    isRiverOperationLoading.value = false;
  }
}

// Message Handling
async function handleSendMessage(content: string, models: LLMModel[], webSearchEnabled: boolean) {
  if (!currentRiver.value) {
    handleCreateFirstRiver();
    // Wait a tick for river to be created
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  isSendingMessage.value = true;
  try {
    // If in new root mode, create a new root node (parentId = null)
    const parentId = isNewRootMode.value
      ? null
      : (currentPath.value.length > 0
          ? currentPath.value[currentPath.value.length - 1]?.id || null
          : null);

    // Exit new root mode
    if (isNewRootMode.value) {
      isNewRootMode.value = false;
    }

    // Create user node
    const userNode = createUserNode(content, parentId);
    selectNode(userNode.id);

    // Generate AI responses for all selected models in parallel
    const promises = models.map(model => generateAIResponse(userNode.id, model, webSearchEnabled));
    await Promise.all(promises);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to send message', 'error');
  } finally {
    isSendingMessage.value = false;
  }
}

async function handleResend(userNodeId: string, models: LLMModel[], webSearchEnabled: boolean) {
  if (!currentRiver.value) {
    handleCreateFirstRiver();
    // Wait a tick for river to be created
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const userNode = currentRiver.value?.nodes[userNodeId];
  if (!userNode || userNode.type !== 'user') {
    showToast('Invalid user message', 'error');
    return;
  }

  isSendingMessage.value = true;
  try {
    // Generate AI responses directly from the existing user node (no new user node created)
    const promises = models.map(model => generateAIResponse(userNodeId, model, webSearchEnabled));
    await Promise.all(promises);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to resend message', 'error');
  } finally {
    isSendingMessage.value = false;
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

  // Use the last used model or first available model
  const model = settings.value.lastUsedModel || settings.value.availableModels?.[0];
  if (!model) {
    showToast('No models available', 'error');
    return;
  }

  try {
    showToast('Generating new response...', 'info');
    await generateAIResponse(parentNodeId, model, false);
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
    const model = settings.value.lastUsedModel || settings.value.availableModels?.[0];
    if (model) {
      generateAIResponse(nodeId, model, false);
      showToast('Message updated, generating new response...', 'info');
    } else {
      showToast('No models available', 'error');
    }
  }
}

function handleDeleteBranch(nodeId: string) {
  deleteConfirmation.value = {
    isOpen: true,
    nodeId,
  };
}

function handleDeleteBranchesBatch(nodeIds: string[]) {
  deleteBatchConfirmation.value = {
    isOpen: true,
    nodeIds,
  };
}

function confirmDeleteBranch() {
  const nodeId = deleteConfirmation.value.nodeId;
  if (nodeId) {
    deleteNode(nodeId);
    showToast('Branch deleted', 'success');
  }
}

function confirmDeleteBranchesBatch() {
  const nodeIds = deleteBatchConfirmation.value.nodeIds;
  if (nodeIds.length > 0 && currentRiver.value) {
    // Filter out nodes that are descendants of other nodes in the selection
    // This prevents trying to delete nodes that will already be deleted as descendants
    const nodeIdsSet = new Set(nodeIds);
    const nodesToDelete = nodeIds.filter(nodeId => {
      const node = currentRiver.value!.nodes[nodeId];
      if (!node) return false;
      
      // Check if any ancestor of this node is also in the selection
      let currentParentId = node.parentId;
      while (currentParentId) {
        if (nodeIdsSet.has(currentParentId)) {
          // An ancestor is in the selection, so skip this node (it will be deleted with its ancestor)
          return false;
        }
        const parentNode = currentRiver.value!.nodes[currentParentId];
        currentParentId = parentNode?.parentId || null;
      }
      return true;
    });
    
    // Delete only the top-level selected nodes (descendants will be deleted automatically)
    nodesToDelete.forEach(nodeId => {
      deleteNode(nodeId);
    });
    
    showToast(`Deleted ${nodeIds.length} nodes`, 'success');
  }
  deleteBatchConfirmation.value.isOpen = false;
  
  // Clear multi-selection state to prevent chat window from showing
  hasMultipleNodesSelected.value = false;
}

function handleCopyMessage(content: string) {
  navigator.clipboard.writeText(content);
  showToast('Message copied to clipboard', 'success');
}

function handleUpdatePosition(nodeId: string, position: { x: number; y: number }) {
  updateNodePosition(nodeId, position);
}

function handleUpdatePositionsBatch(updates: Array<{ nodeId: string; position: { x: number; y: number } }>) {
  // Update all positions in a single batch to avoid multiple reactive updates
  updateNodePositionsBatch(updates);
}

function handleCreateRootNode() {
  // Enter new root mode - open chat window for new conversation
  selectNode(null);
  isNewRootMode.value = true;
}

function handlePaneClick() {
  // Hide chat when clicking on canvas
  isNewRootMode.value = false;
}

function handleSelectionChange(hasMultiple: boolean) {
  hasMultipleNodesSelected.value = hasMultiple;
}

function handleSearch() {
  showToast('Search functionality coming soon!', 'info');
}

async function handleBranchFromText(nodeId: string, highlightedText: string, userPrompt: string, models: LLMModel[], webSearchEnabled: boolean) {
  if (!currentRiver.value) return;

  isSendingMessage.value = true;
  try {
    // Create branches for all selected models in parallel
    const promises = models.map(model => branchFromText(nodeId, highlightedText, userPrompt, model, webSearchEnabled));
    await Promise.all(promises);
    showToast(`Creating ${models.length} branch${models.length > 1 ? 'es' : ''} with selected context...`, 'info');
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to create branch', 'error');
  } finally {
    isSendingMessage.value = false;
  }
}

async function handleChatModelChanged(models: LLMModel[]) {
  // Save chat model selection to persist across prompts and sessions
  settings.value.lastChatSelectedModels = models;
  // Persist to database immediately (bypass debounce for real-time persistence)
  await updateSettings({ lastChatSelectedModels: models }, true);
}

function handleCloseChatPanel() {
  selectNode(null);
  isNewRootMode.value = false;
}

function handlePopOutChat() {
  showChatModal.value = true;
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
    // Check if user is typing in an input/textarea
    const isTyping = (e.target as HTMLElement)?.tagName === 'INPUT' || 
                     (e.target as HTMLElement)?.tagName === 'TEXTAREA';

    // Ctrl/Cmd + ?: Show keyboard shortcuts help
    if ((e.ctrlKey || e.metaKey) && e.key === '?') {
      e.preventDefault();
      showHelp.value = true;
    }

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

    // Ctrl/Cmd + N: Create new river
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      showRiverDashboard.value = true;
    }

    // Ctrl/Cmd + R: Create new root node
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      if (currentRiver.value) {
        handleCreateRootNode();
      }
    }

    // Ctrl/Cmd + D: Deselect node
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      selectNode(null);
      isNewRootMode.value = false;
    }

    // Ctrl/Cmd + ]: Toggle chat panel (close if open)
    if ((e.ctrlKey || e.metaKey) && e.key === ']') {
      e.preventDefault();
      if (selectedNodeId.value || isNewRootMode.value) {
        selectNode(null);
        isNewRootMode.value = false;
      }
    }

    // Ctrl/Cmd + [: Focus chat input
    if ((e.ctrlKey || e.metaKey) && e.key === '[') {
      e.preventDefault();
      const chatInput = document.querySelector('textarea') as HTMLTextAreaElement;
      if (chatInput) {
        chatInput.focus();
      }
    }

    // Ctrl/Cmd + M: Toggle minimap
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      handleToggleMinimap();
    }

    // Ctrl/Cmd + +/=: Zoom in
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      handleZoomIn();
    }

    // Ctrl/Cmd + -: Zoom out
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      handleZoomOut();
    }

    // Ctrl/Cmd + 0: Reset zoom
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      handleZoomReset();
    }

    // Ctrl/Cmd + A: Select all nodes
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isTyping) {
      e.preventDefault();
      handleSelectAllNodes();
    }

    // Ctrl/Cmd + Enter: Send message (when chat input is focused)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isTyping) {
      e.preventDefault();
      const chatForm = document.querySelector('form') as HTMLFormElement;
      if (chatForm) {
        chatForm.requestSubmit();
      }
    }

    // Escape: Close modals or deselect
    if (e.key === 'Escape') {
      if (showChatModal.value) {
        showChatModal.value = false;
      } else if (showHelp.value || showSettings.value || showRiverDashboard.value || showMessageViewer.value) {
        showHelp.value = false;
        showSettings.value = false;
        showRiverDashboard.value = false;
        showMessageViewer.value = false;
      } else if (selectedNodeId.value || isNewRootMode.value) {
        selectNode(null);
        isNewRootMode.value = false;
      }
    }

    // Actions that require a selected node
    if (selectedNodeId.value && currentRiver.value) {
      const currentNode = currentRiver.value.nodes[selectedNodeId.value];

      // Ctrl/Cmd + B: Branch from selected node
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        handleBranchFrom(selectedNodeId.value);
        showToast('Branch from this node by sending a new message', 'info');
      }

      // Ctrl/Cmd + G: Regenerate AI response
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (currentNode?.type === 'ai' && currentNode.parentId) {
          handleRegenerate(currentNode.parentId);
        } else {
          showToast('Can only regenerate AI responses', 'error');
        }
      }

      // Ctrl/Cmd + E: Edit & resubmit
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (currentNode?.type === 'user') {
          handleEditResubmit(selectedNodeId.value);
        } else {
          showToast('Can only edit user messages', 'error');
        }
      }

      // Ctrl/Cmd + C: Copy message (only if not typing)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isTyping) {
        e.preventDefault();
        if (currentNode) {
          handleCopyMessage(currentNode.content);
        }
      }

      // Ctrl/Cmd + V: View full message (only if not typing)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isTyping) {
        e.preventDefault();
        if (currentNode) {
          viewingMessage.value = currentNode;
          showMessageViewer.value = true;
        }
      }

      // Ctrl/Cmd + Delete: Delete branch
      if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
        e.preventDefault();
        handleDeleteBranch(selectedNodeId.value);
      }
    }
  });
}

// Graph control functions
function handleZoomIn() {
  if (graphCanvas.value?.$el) {
    const zoomInButton = graphCanvas.value.$el.querySelector('.vue-flow__controls-zoom-in');
    if (zoomInButton) {
      zoomInButton.click();
    }
  }
}

function handleZoomOut() {
  if (graphCanvas.value?.$el) {
    const zoomOutButton = graphCanvas.value.$el.querySelector('.vue-flow__controls-zoom-out');
    if (zoomOutButton) {
      zoomOutButton.click();
    }
  }
}

function handleZoomReset() {
  if (graphCanvas.value?.$el) {
    const fitViewButton = graphCanvas.value.$el.querySelector('.vue-flow__controls-fitview');
    if (fitViewButton) {
      fitViewButton.click();
    }
  }
}

function handleToggleMinimap() {
  if (graphCanvas.value?.$el) {
    const minimap = graphCanvas.value.$el.querySelector('.vue-flow__minimap');
    if (minimap) {
      minimap.style.display = minimap.style.display === 'none' ? 'block' : 'none';
    }
  }
}

function handleSelectAllNodes() {
  if (currentRiver.value && graphCanvas.value?.$el) {
    const nodeElements = graphCanvas.value.$el.querySelectorAll('.vue-flow__node');
    nodeElements.forEach((node: HTMLElement) => {
      node.classList.add('selected');
      // Trigger a click with ctrl key held
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        metaKey: true,
      });
      node.dispatchEvent(event);
    });
    showToast(`Selected ${nodeElements.length} nodes`, 'info');
  }
}
</script>

<style>
/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  z-index: 10;
  transition: background-color 0.15s ease;
  will-change: background-color;
  touch-action: none;
}

.resize-handle:hover {
  background: var(--color-primary);
  opacity: 0.3;
}

.resize-handle:active {
  background: var(--color-primary);
  opacity: 0.5;
}

/* Prevent text selection during resize */
body.resizing,
body.resizing * {
  user-select: none !important;
  cursor: col-resize !important;
}

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
    border-top: 1px solid var(--color-border);
  }

  .flex-1.relative.overflow-hidden {
    height: 60vh;
  }
  
  .resize-handle {
    display: none;
  }
}
</style>
