<template>
  <div class="flex flex-col h-full relative" style="background: var(--color-background-secondary);">
    <!-- Text Highlight Popover (render at top level for proper positioning) -->
    <Teleport to="body">
      <TextHighlightPopover
        :visible="highlightPopover.visible"
        :position="highlightPopover.position"
        @branch="handleSetBranchContext"
      />
    </Teleport>

    <!-- Floating Title Label -->
    <div class="absolute top-4 left-4 z-10 px-3 py-2 rounded-lg shadow-lg" style="background: var(--color-background); border: 1px solid var(--color-border);">
      <h2 class="text-xs font-semibold" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
        {{ isNewRootMode ? 'New Thread' : 'Chat' }}
      </h2>
    </div>

    <!-- Floating Message Count -->
    <div v-if="!isNewRootMode" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 px-3 py-2 rounded-lg shadow-lg" style="background: var(--color-background); border: 1px solid var(--color-border);">
      <div class="text-[10px] font-medium" style="color: var(--color-text-tertiary);">
        {{ path.length }} message{{ path.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Floating Action Buttons -->
    <div class="absolute top-4 right-4 z-10 flex gap-2">
      <button
        @click="$emit('pop-out')"
        class="p-2 rounded-lg transition-all shadow-lg hover:opacity-80"
        style="background: var(--color-background); border: 1px solid var(--color-border); color: var(--color-text-secondary); cursor: pointer;"
        title="Pop out chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
        </svg>
      </button>
      <button
        @click="$emit('close')"
        class="p-2 rounded-lg transition-all shadow-lg hover:opacity-80"
        style="background: var(--color-background); border: 1px solid var(--color-border); color: var(--color-text-secondary); cursor: pointer;"
        title="Close chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 pt-16">
      <div v-if="path.length === 0 && !isNewRootMode" class="flex items-center justify-center h-full px-5 py-10">
        <p class="text-xs text-center font-medium" style="color: var(--color-text-tertiary);">
          Type a message into the chat to create a new thread
        </p>
      </div>

      <div v-if="isNewRootMode" class="flex items-center justify-center h-full px-5 py-10">
        <div class="text-center">
          <div class="text-4xl mb-4">🌊</div>
          <p class="text-sm font-semibold mb-2" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
            Start a New Thread
          </p>
          <p class="text-xs font-medium" style="color: var(--color-text-tertiary);">
            This will create a new root conversation node. Type your message below to begin.
          </p>
        </div>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="message in path"
          :key="message.id"
          class="p-4 cursor-pointer transition-all duration-200 ease-material rounded-lg card-material hover:-translate-x-1"
          :class="{
            'bg-primary/20 border-primary/40': message.type === 'user',
            'bg-secondary/20 border-secondary/40': message.type === 'ai',
            'border-2 border-primary shadow-[0_0_0_3px] shadow-primary/30': message.id === selectedNodeId,
          }"
          @click.stop="$emit('node-select', message.id)"
        >
          <!-- Header -->
          <div class="flex justify-between items-center mb-2.5 gap-2">
            <div class="flex items-center gap-2">
              <span
                class="text-[10.5px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border flex items-center gap-1.5"
                :class="message.type === 'user' ? 'bg-primary/30 border-primary/50 text-primary' : 'bg-secondary/30 border-secondary/50 text-secondary'"
              >
                <User v-if="message.type === 'user'" :size="12" />
                <Bot v-else :size="12" />
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
            <span v-if="message.model" class="text-[11px] font-medium text-white/75 overflow-hidden text-ellipsis whitespace-nowrap">
              {{ message.model.name }}
            </span>
          </div>

          <!-- Branch Metadata (if this message is a branch) -->
          <div v-if="message.branchMetadata" class="mb-2 p-2.5 bg-accent/10 border border-accent/30 rounded-lg">
            <div class="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Selected Text</div>
            <div class="text-[12px] text-white/75 italic font-medium pl-2 border-l-2 border-accent/50">
              "{{ message.branchMetadata.highlightedText }}"
            </div>
          </div>

          <!-- Content -->
          <div 
            class="text-white/95 text-[13.5px] leading-relaxed mb-2.5 break-words markdown-content"
            @mouseup.stop="handleTextSelection($event, message.id)"
          >
            <div v-html="renderMarkdown(message.content || '...')"></div>
            <span v-if="message.state === 'generating'" class="inline-block animate-blink text-info font-bold">▊</span>
          </div>

          <!-- Footer -->
          <div class="flex justify-between items-center text-[11px] text-white/70">
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

    <!-- Input Area -->
    <div class="p-4 card-material">
      <!-- Hint when user node is selected -->
      <div v-if="!canSend && !isNewRootMode && path.length > 0" class="flex items-center justify-center py-8 px-6">
        <div class="text-center">
          <div class="flex justify-center mb-3">
            <MessageCircle :size="40" :stroke-width="1.5" style="color: var(--color-text-tertiary);" />
          </div>
          <p class="text-white/90 text-base font-bold mb-2">
            Select an AI response to reply
          </p>
          <p class="text-white/60 text-sm font-medium">
            You can only continue the conversation from an AI response
          </p>
        </div>
      </div>

      <!-- Normal input area when AI node is selected or in new root mode -->
      <div v-else>
        <!-- Branch Context Display (like Cursor) -->
        <div v-if="branchContext.text" class="mb-3 p-3 bg-accent/10 border border-accent/30 rounded-lg animate-slide-in">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <GitBranch :size="14" class="text-accent" />
              <span class="text-[11px] font-bold text-accent uppercase tracking-wider">Selected Context</span>
            </div>
            <button
              @click="clearBranchContext"
              class="text-white/50 hover:text-white/90 transition-colors text-xs font-bold px-2 py-0.5 hover:bg-white/10 rounded flex items-center"
              title="Clear context"
            >
              <X :size="14" />
            </button>
          </div>
          <div class="text-[12px] text-white/75 italic pl-3 border-l-2 border-accent/50 max-h-24 overflow-y-auto">
            "{{ branchContext.text }}"
          </div>
        </div>

         <!-- Model Selection Summary (Compact) -->
         <div class="mb-2 flex items-center gap-2">
           <div class="flex-1 min-w-0 flex flex-wrap items-center gap-1">
             <span class="text-[10px] font-medium" style="color: var(--color-text-tertiary);">Model:</span>
             <div v-if="parsedSelectedModels.length > 0" class="flex flex-wrap gap-1">
               <span
                 v-for="model in parsedSelectedModels"
                 :key="model.id"
                 class="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                 style="background: var(--color-primary-muted); color: var(--color-primary);"
               >
                 {{ model.name }}
               </span>
             </div>
             <span v-else class="text-[9px] font-medium" style="color: var(--color-text-tertiary);">
               None
             </span>
           </div>
           <button
             @click="showModelSelectionModal = true"
             class="flex items-center justify-center p-1 rounded hover:bg-white/5 transition-colors"
             style="color: var(--color-text-tertiary);"
             title="Edit model selection"
           >
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
               <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
             </svg>
           </button>
         </div>

         <div class="flex items-end gap-2">
           <textarea
             ref="textareaRef"
             v-model="inputText"
             class="textarea-material text-[13.5px] flex-1"
             :placeholder="branchContext.text ? 'Ask about the selected text...' : 'Type your message...'"
             rows="1"
             style="resize: none; min-height: 40px; max-height: 200px;"
             @input="autoResizeTextarea"
             @keydown="handleKeydown"
           ></textarea>

           <button
             @click="handleSend"
             :disabled="!inputText.trim() || !canSend || selectedModels.length === 0 || isSending"
             class="flex items-center justify-center rounded-lg transition-all"
             :style="(!inputText.trim() || !canSend || selectedModels.length === 0 || isSending) 
               ? 'width: 40px; height: 40px; background: var(--color-border); cursor: not-allowed;'
               : 'width: 40px; height: 40px; background: var(--color-primary); cursor: pointer;'"
             :title="isSending ? 'Sending...' : (selectedModels.length > 1 ? `Send to ${selectedModels.length} models` : 'Send message')"
           >
             <div v-if="isSending" class="loading-spinner-small"></div>
             <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;">
               <path d="M12 19V5M5 12l7-7 7 7"/>
             </svg>
           </button>
         </div>
      </div>
    </div>

    <!-- Model Selection Modal -->
    <ModelSelectionModal
      :is-open="showModelSelectionModal"
      :enabled-models="enabledModels"
      :initial-selected-models="parsedSelectedModels"
      @confirm="handleModelSelectionConfirm"
      @close="showModelSelectionModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import type { MessageNode, LLMModel, APIKeys, Settings } from '../types';
import { getEnabledModelsList } from '../types';
import { User, Bot, GitBranch, AlertTriangle, MessageCircle, X } from 'lucide-vue-next';
import { renderMarkdown, formatTime, getBranchCount } from '../utils/chat';
import TextHighlightPopover from './TextHighlightPopover.vue';
import ModelSelectionModal from './ModelSelectionModal.vue';

interface Props {
  path: MessageNode[];
  selectedNodeId: string | null;
  lastUsedModel: LLMModel | null;
  isNewRootMode?: boolean;
  allNodes?: Record<string, MessageNode>;
  apiKeys?: APIKeys;
  settings?: Settings;
  isSending?: boolean;
}

interface Emits {
  (e: 'send', content: string, models: LLMModel[]): void;
  (e: 'node-select', nodeId: string): void;
  (e: 'branch-from-text', nodeId: string, highlightedText: string, elaborationPrompt: string, models: LLMModel[]): void;
  (e: 'chat-model-changed', models: LLMModel[]): void;
  (e: 'close'): void;
  (e: 'pop-out'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const inputText = ref('');
const selectedModels = ref<string[]>([]);
const messagesContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const showModelSelectionModal = ref(false);

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

// Get enabled models from settings
const enabledModels = computed(() => {
  if (!props.settings?.enabledModels || !props.settings?.availableModels) {
    return [];
  }
  return getEnabledModelsList(props.settings.enabledModels, props.settings.availableModels);
});

// Parse selected models from JSON strings
const parsedSelectedModels = computed(() => {
  return selectedModels.value
    .map(jsonStr => {
      try {
        return JSON.parse(jsonStr) as LLMModel;
      } catch {
        return null;
      }
    })
    .filter((m): m is LLMModel => m !== null);
});

// Track if we're currently restoring from saved state to prevent loops
const isRestoringSelection = ref(false);

// Initialize from lastChatSelectedModels (persists across prompts)
watch(
  () => props.settings?.lastChatSelectedModels,
  (lastSelected) => {
    isRestoringSelection.value = true;
    if (lastSelected && lastSelected.length > 0) {
      // Restore last selected models from previous session
      selectedModels.value = lastSelected.map(m => JSON.stringify(m));
    } else if (selectedModels.value.length === 0) {
      // No previous selection, default to first available model
      const enabledModels = props.settings?.enabledModels && props.settings?.availableModels
        ? getEnabledModelsList(props.settings.enabledModels, props.settings.availableModels)
        : [];
      if (enabledModels.length > 0) {
        // Default to first free model, otherwise first model
        const defaultModel = enabledModels.find(m => m.isFree) || enabledModels[0];
        selectedModels.value = [JSON.stringify(defaultModel)];
      }
    }
    // Use nextTick to reset the flag after the update completes
    nextTick(() => {
      isRestoringSelection.value = false;
    });
  },
  { immediate: true, deep: true }
);

// Watch for changes in enabled models and filter out models that are no longer available
watch(
  () => props.settings?.enabledModels,
  (enabledModelsRecord) => {
    if (!enabledModelsRecord || !props.settings?.availableModels) {
      selectedModels.value = [];
      return;
    }

    const enabledModels = getEnabledModelsList(enabledModelsRecord, props.settings.availableModels);
    if (enabledModels.length === 0) {
      selectedModels.value = [];
      return;
    }

    // Get set of currently enabled model strings for fast lookup
    const enabledModelStrings = new Set(enabledModels.map(m => JSON.stringify(m)));

    // Filter currently selected models to only include enabled ones
    const filteredSelection = selectedModels.value.filter(ms => enabledModelStrings.has(ms));

    // If all selected models were removed, default to first enabled model
    if (filteredSelection.length === 0 && enabledModels.length > 0) {
      const defaultModel = enabledModels.find(m => m.isFree) || enabledModels[0];
      selectedModels.value = [JSON.stringify(defaultModel)];
    } else if (filteredSelection.length !== selectedModels.value.length) {
      // Only update if something actually changed
      selectedModels.value = filteredSelection;
    }
  },
  { deep: true }
);

// Watch for model changes and persist to lastChatSelectedModels (persists across prompts)
// Only emit if not currently restoring to prevent infinite loops
watch(selectedModels, (newModels) => {
  if (!isRestoringSelection.value && newModels && newModels.length > 0) {
    const models = newModels.map(m => JSON.parse(m) as LLMModel);
    // Emit to save to lastChatSelectedModels
    emit('chat-model-changed', models);
  }
});

const canSend = computed(() => {
  return props.isNewRootMode || props.path.length === 0 || props.path[props.path.length - 1]?.type === 'ai';
});

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

// Consolidated autofocus logic - focus textarea when it becomes available
watch(
  [() => props.isNewRootMode, () => props.selectedNodeId, () => props.path, canSend],
  async () => {
    // Focus should happen when:
    // 1. In new root mode, OR
    // 2. Can send (AI response selected or empty path) and not in new root mode
    const shouldFocus = props.isNewRootMode || (canSend.value && !props.isNewRootMode && props.path.length > 0);
    
    if (shouldFocus) {
      // Use requestAnimationFrame for more reliable DOM update timing
      await nextTick();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          textareaRef.value?.focus();
        });
      });
    }
  },
  { immediate: true, flush: 'post' }
);

function autoResizeTextarea() {
  const textarea = textareaRef.value;
  if (textarea) {
    textarea.style.height = '40px';
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

function handleModelSelectionConfirm(models: LLMModel[]) {
  // Convert models to JSON strings for selectedModels
  selectedModels.value = models.map(m => JSON.stringify(m));
  showModelSelectionModal.value = false;
}

function handleSend() {
  if (inputText.value.trim() && selectedModels.value.length > 0 && canSend.value) {
    const models = selectedModels.value.map(m => JSON.parse(m) as LLMModel);

    // Check if we have branch context
    if (branchContext.value.text && branchContext.value.sourceNodeId) {
      // Send as a branch with context
      emit('branch-from-text', branchContext.value.sourceNodeId, branchContext.value.text, inputText.value.trim(), models);
      clearBranchContext();
    } else {
      // Regular message
      emit('send', inputText.value.trim(), models);
    }

    inputText.value = '';
    // Reset textarea height after sending
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.style.height = '40px';
      }
    });
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
        
        // Position popover to the left of the selection
        // Use the left edge of the selection
        const leftX = rect.left;
        const topY = rect.top + window.scrollY;
        
        highlightPopover.value = {
          visible: true,
          position: {
            x: leftX,
            y: topY,
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
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
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
