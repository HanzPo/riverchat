<template>
  <div v-if="isOpen" class="fixed inset-0 flex flex-col z-[200]" style="background: var(--color-background);">
    <!-- Floating Back Button -->
    <button
      @click="emit('close')"
      class="fixed top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg hover:opacity-80 transition-all shadow-lg"
      style="background: var(--color-background-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);"
      title="Back"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Back
    </button>
    
    <!-- Floating Title Label -->
    <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-10 px-4 py-2 rounded-lg shadow-lg" style="background: var(--color-background-secondary); border: 1px solid var(--color-border);">
      <h1 class="text-sm font-semibold" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
        {{ isNewRootMode ? 'New Conversation' : 'Chat History' }}
      </h1>
    </div>
    
    <!-- Floating Message Count (only show if not new root mode) -->
    <div v-if="!isNewRootMode" class="fixed top-4 right-4 z-10 px-3 py-2 rounded-lg shadow-lg" style="background: var(--color-background-secondary); border: 1px solid var(--color-border);">
      <div class="text-xs font-medium" style="color: var(--color-text-tertiary);">
        {{ path.length }} message{{ path.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto pt-16">
      <!-- Empty state -->
      <div v-if="path.length === 0 && !isNewRootMode" class="flex items-center justify-center h-full px-5 py-10">
        <p class="text-sm text-center font-medium" style="color: var(--color-text-tertiary);">
          Type a message into the chat to create a new thread
        </p>
      </div>

      <!-- New root mode welcome -->
      <div v-if="isNewRootMode" class="flex items-center justify-center h-full px-5 py-10">
        <div class="text-center">
          <div class="text-5xl mb-4">🌊</div>
          <p class="text-xl font-semibold mb-3" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
            Start a New Thread
          </p>
          <p class="text-sm font-medium max-w-md" style="color: var(--color-text-tertiary);">
            This will create a new root conversation node. Type your message below to begin.
          </p>
        </div>
      </div>

      <!-- Messages container centered like ChatGPT/Claude -->
      <div v-else class="max-w-3xl mx-auto py-6 px-4">
        <div class="flex flex-col gap-6">
          <div
            v-for="message in path"
            :key="message.id"
            class="cursor-pointer transition-all duration-200 ease-material"
            @click.stop="$emit('node-select', message.id)"
          >
            <!-- Message bubble -->
            <div 
              class="p-5 rounded-lg transition-all"
              :class="{
                'hover:shadow-md': true,
                'border-2 border-primary shadow-lg shadow-primary/20': message.id === selectedNodeId,
              }"
              :style="message.type === 'user' 
                ? 'background: var(--color-background-secondary); border: 1px solid var(--color-border);'
                : 'background: var(--color-background-secondary); border: 1px solid var(--color-border);'"
            >
              <!-- Header -->
              <div class="flex justify-between items-center mb-3 gap-2">
                <div class="flex items-center gap-2.5">
                  <span
                    class="text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border flex items-center gap-1.5"
                    :class="message.type === 'user' ? 'bg-primary/30 border-primary/50 text-primary' : 'bg-secondary/30 border-secondary/50 text-secondary'"
                  >
                    <User v-if="message.type === 'user'" :size="13" />
                    <Bot v-else :size="13" />
                    <span>{{ message.type === 'user' ? 'YOU' : 'AI' }}</span>
                  </span>
                  <span
                    v-if="getBranchCount(message.id, props.allNodes) > 0"
                    class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/30 border border-accent/50 text-accent flex items-center gap-1"
                    :title="`${getBranchCount(message.id, props.allNodes)} branch${getBranchCount(message.id, props.allNodes) > 1 ? 'es' : ''} from highlighted text`"
                  >
                    <GitBranch :size="11" />
                    <span>{{ getBranchCount(message.id, props.allNodes) }}</span>
                  </span>
                </div>
                <span v-if="message.model" class="text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap" style="color: var(--color-text-tertiary);">
                  {{ message.model.name }}
                </span>
              </div>

              <!-- Branch Metadata (if this message is a branch) -->
              <div v-if="message.branchMetadata" class="mb-2 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                <div class="text-[10px] font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-text-tertiary);">Selected Text</div>
                <div class="text-xs italic font-medium pl-2.5 border-l-2 border-accent/50" style="color: var(--color-text-secondary);">
                  "{{ message.branchMetadata.highlightedText }}"
                </div>
              </div>

              <!-- Content -->
              <div 
                class="text-sm leading-relaxed mb-3 break-words markdown-content"
                style="color: var(--color-text-primary);"
                @mouseup.stop="handleTextSelection($event, message.id)"
              >
                <div v-html="renderMarkdown(message.content || '...')"></div>
                <span v-if="message.state === 'generating'" class="inline-block animate-blink text-info font-bold">▊</span>
              </div>

              <!-- Footer -->
              <div class="flex justify-between items-center text-xs" style="color: var(--color-text-tertiary);">
                <span class="font-medium">
                  {{ formatTime(message.timestamp) }}
                </span>
                <span v-if="message.state === 'error'" class="text-error font-bold flex items-center gap-1">
                  <AlertTriangle :size="12" />
                  <span>Error</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area (centered like ChatGPT/Claude) -->
    <div style="background: var(--color-background);">
      <div class="max-w-3xl mx-auto px-4 py-4">
        <!-- Resend interface when user node is selected -->
        <div v-if="!canSend && !isNewRootMode && path.length > 0 && selectedUserMessage" class="py-4">
          <div class="mb-2 flex items-center gap-1.5 flex-wrap">
            <button
              @click="canEnableWebSearch ? webSearchEnabled = !webSearchEnabled : null"
              class="flex items-center justify-center rounded-lg transition-all"
              :class="{ 'hover:opacity-80': canEnableWebSearch, 'cursor-not-allowed opacity-50': !canEnableWebSearch }"
              :style="'width: 20px; height: 20px; background: transparent; cursor: ' + (canEnableWebSearch ? 'pointer' : 'not-allowed') + ';'"
              :title="canEnableWebSearch ? (webSearchEnabled ? 'Web search enabled' : 'Web search disabled') : 'Upgrade to use web search'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="webSearchEnabled && canEnableWebSearch ? 'color: var(--color-primary);' : 'color: var(--color-text-tertiary);'">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </button>
            <div v-for="(modelId, index) in selectedModelIds" :key="index" class="flex items-center gap-0.5">
              <ModelDropdown
                :selected-model-id="modelId"
                :available-models="subscription.availableModels.value"
                @select="(id: string) => handleModelSelect(index, id)"
              />
              <button
                v-if="selectedModelIds.length > 1"
                @click="removeModelSlot(index)"
                class="p-0.5 rounded hover:bg-white/10 transition-colors"
                style="color: var(--color-text-tertiary);"
                title="Remove model"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <button
              v-if="selectedModelIds.length < subscription.maxModelsPerPrompt.value"
              @click="addModelSlot"
              class="flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/10 transition-colors"
              style="color: var(--color-text-tertiary); border: 1px dashed var(--color-border);"
              title="Add model"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>

          <div class="mb-3 p-4 rounded-lg" style="background: var(--color-background-secondary); border: 1px solid var(--color-border);">
            <div class="text-sm leading-relaxed break-words whitespace-pre-wrap" style="color: var(--color-text-tertiary); opacity: 0.6;">
              {{ selectedUserMessage.content }}
            </div>
          </div>

          <div class="flex justify-end">
            <button
              @click="handleResend"
              :disabled="selectedModelIds.length === 0 || isSending"
              class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm"
              :style="(selectedModelIds.length === 0 || isSending)
                ? 'background: var(--color-border); color: var(--color-text-tertiary); cursor: not-allowed;'
                : 'background: var(--color-primary); color: white; cursor: pointer;'"
            >
              <div v-if="isSending" class="loading-spinner-small"></div>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              <span>Resend</span>
            </button>
          </div>
        </div>

        <!-- Normal input area -->
        <div v-else>
          <div v-if="branchContext.text" class="mb-4 p-3.5 bg-accent/10 border border-accent/30 rounded-lg animate-slide-in">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <GitBranch :size="16" class="text-accent" />
                <span class="text-xs font-bold text-accent uppercase tracking-wider">Selected Context</span>
              </div>
              <button
                @click="clearBranchContext"
                class="transition-colors text-xs font-bold px-2 py-1 rounded-md hover:bg-white/10"
                style="color: var(--color-text-tertiary);"
                title="Clear context"
              >
                <X :size="16" />
              </button>
            </div>
            <div class="text-sm italic pl-3 border-l-2 border-accent/50 max-h-24 overflow-y-auto" style="color: var(--color-text-secondary);">
              "{{ branchContext.text }}"
            </div>
          </div>

          <div class="mb-2 flex items-center gap-1.5 flex-wrap">
            <button
              @click="canEnableWebSearch ? webSearchEnabled = !webSearchEnabled : null"
              class="flex items-center justify-center rounded-lg transition-all"
              :class="{ 'hover:opacity-80': canEnableWebSearch, 'cursor-not-allowed opacity-50': !canEnableWebSearch }"
              :style="'width: 20px; height: 20px; background: transparent; cursor: ' + (canEnableWebSearch ? 'pointer' : 'not-allowed') + ';'"
              :title="canEnableWebSearch ? (webSearchEnabled ? 'Web search enabled' : 'Web search disabled') : 'Upgrade to use web search'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="webSearchEnabled && canEnableWebSearch ? 'color: var(--color-primary);' : 'color: var(--color-text-tertiary);'">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </button>
            <div v-for="(modelId, index) in selectedModelIds" :key="index" class="flex items-center gap-0.5">
              <ModelDropdown
                :selected-model-id="modelId"
                :available-models="subscription.availableModels.value"
                @select="(id: string) => handleModelSelect(index, id)"
              />
              <button
                v-if="selectedModelIds.length > 1"
                @click="removeModelSlot(index)"
                class="p-0.5 rounded hover:bg-white/10 transition-colors"
                style="color: var(--color-text-tertiary);"
                title="Remove model"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <button
              v-if="selectedModelIds.length < subscription.maxModelsPerPrompt.value"
              @click="addModelSlot"
              class="flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/10 transition-colors"
              style="color: var(--color-text-tertiary); border: 1px dashed var(--color-border);"
              title="Add model"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>

          <div class="flex items-end gap-3">
            <textarea
              ref="textareaRef"
              v-model="inputText"
              class="textarea-material text-sm flex-1"
              :placeholder="branchContext.text ? 'Ask about the selected text...' : 'Type your message...'"
              rows="1"
              style="resize: none; min-height: 44px; max-height: 200px;"
              @input="autoResizeTextarea"
              @keydown="handleKeydown"
            ></textarea>

            <button
              @click="handleSend"
              :disabled="!inputText.trim() || !canSend || selectedModelIds.length === 0 || isSending"
              class="flex items-center justify-center rounded-lg transition-all"
              :style="(!inputText.trim() || !canSend || selectedModelIds.length === 0 || isSending)
                ? 'width: 44px; height: 44px; background: var(--color-border); cursor: not-allowed;'
                : 'width: 44px; height: 44px; background: var(--color-primary); cursor: pointer;'"
            >
              <div v-if="isSending" class="loading-spinner-small"></div>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <TextHighlightPopover
        :visible="highlightPopover.visible"
        :position="highlightPopover.position"
        @branch="handleSetBranchContext"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import type { MessageNode, LLMModel, Settings } from '../types';
import { resolveModelIds, DEFAULT_MODEL_ID } from '../types';
import { User, Bot, GitBranch, AlertTriangle, X } from 'lucide-vue-next';
import { renderMarkdown, formatTime, getBranchCount } from '../utils/chat';
import TextHighlightPopover from './TextHighlightPopover.vue';
import ModelDropdown from './ModelDropdown.vue';
import { useSubscription } from '../composables/useSubscription';
import type { User as FirebaseUser } from 'firebase/auth';

interface Props {
  isOpen: boolean;
  path: MessageNode[];
  selectedNodeId: string | null;
  isNewRootMode?: boolean;
  allNodes?: Record<string, MessageNode>;
  settings?: Settings;
  isSending?: boolean;
  currentUser?: FirebaseUser | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'send', content: string, models: LLMModel[], webSearchEnabled: boolean): void;
  (e: 'node-select', nodeId: string): void;
  (e: 'branch-from-text', nodeId: string, highlightedText: string, elaborationPrompt: string, models: LLMModel[], webSearchEnabled: boolean): void;
  (e: 'chat-model-changed', modelIds: string[]): void;
  (e: 'resend', userNodeId: string, models: LLMModel[], webSearchEnabled: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const inputText = ref('');
const selectedModelIds = ref<string[]>([]);
const messagesContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const webSearchEnabled = ref(false);

const subscription = useSubscription();

// Check if web search can be enabled (based on subscription tier)
const canEnableWebSearch = computed(() => {
  return !!props.currentUser && subscription.webSearchEnabled.value;
});

// Text selection and highlight popover state
const highlightPopover = ref({
  visible: false,
  position: { x: 0, y: 0 },
  selectedText: '',
  sourceNodeId: '',
});

// Branch context state (shows above input like Cursor)
const branchContext = ref({
  text: '',
  sourceNodeId: '',
});

let isSelecting = false;
let isInitializing = true;
let isSyncingFromParent = false;

// Initialize from settings
watch(
  () => props.settings?.selectedModelIds,
  (ids) => {
    isSyncingFromParent = true;
    if (ids && ids.length > 0) {
      selectedModelIds.value = [...ids];
    } else if (selectedModelIds.value.length === 0 && subscription.availableModels.value.length > 0) {
      const defaultModel = subscription.availableModels.value.find(m => m.id === DEFAULT_MODEL_ID);
      selectedModelIds.value = [defaultModel?.id ?? subscription.availableModels.value[0]!.id];
    }
    nextTick(() => { isInitializing = false; isSyncingFromParent = false; });
  },
  { immediate: true }
);

// Sync model changes back to parent
watch(selectedModelIds, (ids) => {
  if (!isInitializing && !isSyncingFromParent && ids.length > 0) {
    emit('chat-model-changed', ids);
  }
}, { deep: true });

// Watch for changes in canEnableWebSearch and disable web search if conditions are no longer met
watch(canEnableWebSearch, (canEnable) => {
  if (!canEnable && webSearchEnabled.value) {
    webSearchEnabled.value = false;
  }
});

function handleModelSelect(index: number, modelId: string) {
  if (selectedModelIds.value.some((id, i) => id === modelId && i !== index)) return;
  const newIds = [...selectedModelIds.value];
  newIds[index] = modelId;
  selectedModelIds.value = newIds;
}

function addModelSlot() {
  if (selectedModelIds.value.length < subscription.maxModelsPerPrompt.value) {
    const usedIds = new Set(selectedModelIds.value);
    const nextModel = subscription.availableModels.value.find(m => !usedIds.has(m.id) && subscription.canAccessModel(m));
    if (nextModel) {
      selectedModelIds.value = [...selectedModelIds.value, nextModel.id];
    }
  }
}

function removeModelSlot(index: number) {
  if (selectedModelIds.value.length > 1) {
    selectedModelIds.value = selectedModelIds.value.filter((_, i) => i !== index);
  }
}

const canSend = computed(() => {
  return props.isNewRootMode || props.path.length === 0 || props.path[props.path.length - 1]?.type === 'ai';
});

// Get the selected user message when a user message is selected
const selectedUserMessage = computed(() => {
  if (!props.selectedNodeId || props.path.length === 0) return null;
  return props.path.find(msg => msg.id === props.selectedNodeId && msg.type === 'user') || null;
});

// Clear branch context and popover when switching nodes
watch(
  () => props.selectedNodeId,
  () => {
    clearBranchContext();
    highlightPopover.value.visible = false;
  }
);

// Scroll to bottom when path changes
watch(
  () => props.path,
  async () => {
    // Use requestAnimationFrame for more reliable scroll timing after DOM updates
    await nextTick();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    });
  },
  { immediate: true, deep: true, flush: 'post' }
);

// Autofocus textarea and scroll to bottom when modal opens
watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      // Scroll to bottom when modal opens
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
          }
          // Focus textarea after scrolling
          textareaRef.value?.focus();
        });
      });
    }
  },
  { immediate: true }
);

function autoResizeTextarea() {
  const textarea = textareaRef.value;
  if (textarea) {
    textarea.style.height = '44px';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }
}

function handleKeydown(event: KeyboardEvent) {
  // Handle Enter key
  if (event.key === 'Enter') {
    // Shift+Enter: insert newline (like Claude)
    if (event.shiftKey) {
      // Allow default behavior (newline)
      return;
    }
    
    // Plain Enter: send message
    event.preventDefault();
    handleSend();
  }
}

function handleSend() {
  if (inputText.value.trim() && selectedModelIds.value.length > 0 && canSend.value && !props.isSending) {
    const models = resolveModelIds(selectedModelIds.value, subscription.availableModels.value);
    if (models.length === 0) return;

    if (branchContext.value.text && branchContext.value.sourceNodeId) {
      emit('branch-from-text', branchContext.value.sourceNodeId, branchContext.value.text, inputText.value.trim(), models, webSearchEnabled.value);
      clearBranchContext();
    } else {
      emit('send', inputText.value.trim(), models, webSearchEnabled.value);
    }

    inputText.value = '';
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.style.height = '44px';
      }
    });
  }
}

function handleResend() {
  if (selectedUserMessage.value && selectedModelIds.value.length > 0 && !props.isSending) {
    const models = resolveModelIds(selectedModelIds.value, subscription.availableModels.value);
    if (models.length === 0) return;
    emit('resend', selectedUserMessage.value.id, models, webSearchEnabled.value);
  }
}

function handleTextSelection(event: MouseEvent, nodeId: string) {
  // Prevent triggering node selection when selecting text
  event.stopPropagation();
  
  // Small delay to allow selection to complete
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      if (!isSelecting) {
        highlightPopover.value.visible = false;
      }
      return;
    }
    
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect && rect.width > 0 && rect.height > 0) {
        isSelecting = true;
        
        // Position popover at the left edge of selection
        // Use viewport-relative coords since popover is position:fixed
        highlightPopover.value = {
          visible: true,
          position: {
            x: rect.left,
            y: rect.top,
          },
          selectedText,
          sourceNodeId: nodeId,
        };
        
        // Reset the flag after a short delay
        setTimeout(() => {
          isSelecting = false;
        }, 150);
      }
    } else {
      // No text selected, hide popover
      if (!isSelecting) {
        highlightPopover.value.visible = false;
      }
    }
  }, 50);
}

function handleSetBranchContext() {
  if (highlightPopover.value.selectedText && highlightPopover.value.sourceNodeId) {
    // Set the branch context to show above input
    branchContext.value = {
      text: highlightPopover.value.selectedText,
      sourceNodeId: highlightPopover.value.sourceNodeId,
    };
    
    // Hide popover
    highlightPopover.value.visible = false;
    
    // Clear selection
    window.getSelection()?.removeAllRanges();
    
    // Focus the textarea
    nextTick(() => {
      textareaRef.value?.focus();
    });
  }
}

function clearBranchContext() {
  branchContext.value = {
    text: '',
    sourceNodeId: '',
  };
}

// Close popover when clicking outside
function handleDocumentClick(event: MouseEvent) {
  // Don't close if we're in the middle of selecting
  if (isSelecting) return;
  
  const target = event.target as HTMLElement;
  // Don't close if clicking on the popover itself
  if (!target.closest('.text-highlight-popover') && !target.closest('.popover-button')) {
    highlightPopover.value.visible = false;
  }
}

// Lifecycle hooks for event listener cleanup
onMounted(() => {
  // Add document click listener
  // Use capture phase and a small delay to avoid interfering with selection
  setTimeout(() => {
    document.addEventListener('mousedown', handleDocumentClick);
  }, 0);
});

onUnmounted(() => {
  // Remove document click listener to prevent memory leaks
  document.removeEventListener('mousedown', handleDocumentClick);
});
</script>

<style scoped>
/* Loading Spinner */
.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.animate-blink {
  animation: blink 1s step-start infinite;
}

/* Markdown content styling */
.markdown-content :deep(p) {
  margin-bottom: 0.75em;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-weight: bold;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.3;
}

.markdown-content :deep(h1) { font-size: 1.5em; }
.markdown-content :deep(h2) { font-size: 1.3em; }
.markdown-content :deep(h3) { font-size: 1.15em; }
.markdown-content :deep(h4) { font-size: 1.05em; }

.markdown-content :deep(code) {
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.15em 0.4em;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.75em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.75em 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  font-size: 0.85em;
  line-height: 1.5;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid rgba(255, 255, 255, 0.3);
  padding-left: 1em;
  margin: 0.75em 0;
  font-style: italic;
  color: rgba(255, 255, 255, 0.8);
}

.markdown-content :deep(a) {
  color: #6eb4f7;
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  color: #8cc5ff;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin: 1em 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 0.75em 0;
  width: 100%;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.5em;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: rgba(255, 255, 255, 0.1);
  font-weight: bold;
}

.markdown-content :deep(strong) {
  font-weight: bold;
}

.markdown-content :deep(em) {
  font-style: italic;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-in {
  animation: slide-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
