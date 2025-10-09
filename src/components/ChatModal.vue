<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content modal-chat-large flex flex-col">
      <!-- Header -->
      <div class="p-5 border-b border-white/15 card-material flex justify-between items-start gap-4">
        <div class="flex-1">
          <h2 class="text-xl font-bold text-white/95">
            {{ isNewRootMode ? 'New Conversation Thread' : 'Chat History' }}
          </h2>
          <p class="text-sm text-white/70 mt-1.5 font-medium">
            {{ isNewRootMode ? 'Start a new root conversation' : `${path.length} message${path.length !== 1 ? 's' : ''} in this branch` }}
          </p>
        </div>
        <button
          @click="emit('close')"
          class="text-white/70 hover:text-white/95 hover:bg-white/10 transition-all p-2 rounded-md"
          title="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6">
        <div v-if="path.length === 0 && !isNewRootMode" class="flex items-center justify-center h-full px-5 py-10">
          <p class="text-white/70 text-base text-center font-medium">
            Type a message into the chat to create a new thread
          </p>
        </div>

        <div v-if="isNewRootMode" class="flex items-center justify-center h-full px-5 py-10">
          <div class="text-center">
            <div class="text-5xl mb-5">🌊</div>
            <p class="text-white/90 text-xl font-bold mb-3">
              Start a New Thread
            </p>
            <p class="text-white/70 text-base font-medium">
              This will create a new root conversation node. Type your message below to begin.
            </p>
          </div>
        </div>

        <div v-else class="flex flex-col gap-4 max-w-4xl mx-auto">
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
            <div class="flex justify-between items-center mb-3 gap-2">
              <div class="flex items-center gap-2">
                <span 
                  class="text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider border"
                  :class="message.type === 'user' ? 'bg-primary/30 border-primary/50 text-primary' : 'bg-secondary/30 border-secondary/50 text-secondary'"
                >
                  {{ message.type === 'user' ? '👤 YOU' : '🤖 AI' }}
                </span>
                <span
                  v-if="getBranchCount(message.id) > 0"
                  class="text-xs font-bold px-2.5 py-1 rounded-md bg-accent/30 border border-accent/50 text-accent flex items-center gap-1"
                  :title="`${getBranchCount(message.id)} branch${getBranchCount(message.id) > 1 ? 'es' : ''} from highlighted text`"
                >
                  <span>🌿</span>
                  <span>{{ getBranchCount(message.id) }}</span>
                </span>
              </div>
              <span v-if="message.model" class="text-xs font-medium text-white/75 overflow-hidden text-ellipsis whitespace-nowrap">
                {{ message.model.displayName }}
              </span>
            </div>

            <!-- Branch Metadata (if this message is a branch) -->
            <div v-if="message.branchMetadata" class="mb-3 p-3 bg-accent/10 border border-accent/30 rounded-md">
              <div class="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Selected Text</div>
              <div class="text-sm text-white/75 italic font-medium pl-3 border-l-2 border-accent/50">
                "{{ message.branchMetadata.highlightedText }}"
              </div>
            </div>

            <!-- Content -->
            <div 
              class="text-white/95 text-sm leading-relaxed mb-3 break-words markdown-content"
              @mouseup.stop="handleTextSelection($event, message.id)"
            >
              <div v-html="renderMarkdown(message.content || '...')"></div>
              <span v-if="message.state === 'generating'" class="inline-block animate-blink text-info font-bold">▊</span>
            </div>

            <!-- Footer -->
            <div class="flex justify-between items-center text-xs text-white/70">
              <span class="font-medium">
                {{ formatTime(message.timestamp) }}
              </span>
              <span v-if="message.state === 'error'" class="text-error font-bold">
                ⚠️ Error
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-6 border-t border-white/15 card-material">
        <!-- Hint when user node is selected -->
        <div v-if="!canSend && !isNewRootMode && path.length > 0" class="flex items-center justify-center py-10 px-6">
          <div class="text-center">
            <div class="text-4xl mb-4">💬</div>
            <p class="text-white/90 text-lg font-bold mb-3">
              Select an AI response to reply
            </p>
            <p class="text-white/60 text-base font-medium">
              You can only continue the conversation from an AI response
            </p>
          </div>
        </div>

        <!-- Normal input area when AI node is selected or in new root mode -->
        <div v-else class="max-w-4xl mx-auto">
          <!-- Branch Context Display (like Cursor) -->
          <div v-if="branchContext.text" class="mb-4 p-3.5 bg-accent/10 border border-accent/30 rounded-lg animate-slide-in">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="text-accent text-base">🌿</span>
                <span class="text-xs font-bold text-accent uppercase tracking-wider">Selected Context</span>
              </div>
              <button
                @click="clearBranchContext"
                class="text-white/50 hover:text-white/90 transition-colors text-sm font-bold px-2.5 py-1 hover:bg-white/10 rounded"
                title="Clear context"
              >
                ✕
              </button>
            </div>
            <div class="text-sm text-white/75 italic pl-3 border-l-2 border-accent/50 max-h-32 overflow-y-auto">
              "{{ branchContext.text }}"
            </div>
          </div>

          <div class="flex gap-3 mb-4 items-center">
            <select v-model="selectedModel" class="select-material flex-1 py-3">
              <optgroup
                v-for="provider in modelsByProvider"
                :key="provider.name"
                :label="provider.name"
              >
                <option
                  v-for="model in provider.models"
                  :key="`${model.provider}-${model.name}`"
                  :value="JSON.stringify(model)"
                >
                  {{ model.displayName }}
                </option>
              </optgroup>
            </select>
          </div>

          <textarea
            ref="textareaRef"
            v-model="inputText"
            class="textarea-material text-sm"
            :placeholder="branchContext.text ? 'Ask about the selected text...' : 'Type your message... (Enter to send, Ctrl+Enter for newline)'"
            rows="4"
            @keydown="handleKeydown"
          ></textarea>

          <div class="flex justify-end gap-3 mt-4">
            <button
              @click="handleSend"
              :disabled="!inputText.trim() || !canSend"
              class="btn-material px-6 py-3 font-bold text-base"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Text Highlight Popover (render at top level for proper positioning) -->
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
import { ref, computed, watch, nextTick } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { MessageNode, LLMModel } from '../types';
import { AVAILABLE_MODELS } from '../types';
import TextHighlightPopover from './TextHighlightPopover.vue';

interface Props {
  isOpen: boolean;
  path: MessageNode[];
  selectedNodeId: string | null;
  lastUsedModel: LLMModel | null;
  isNewRootMode?: boolean;
  allNodes?: Record<string, MessageNode>;
}

interface Emits {
  (e: 'close'): void;
  (e: 'send', content: string, model: LLMModel): void;
  (e: 'node-select', nodeId: string): void;
  (e: 'branch-from-text', nodeId: string, highlightedText: string, elaborationPrompt: string, model: LLMModel): void;
  (e: 'model-changed', model: LLMModel): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const inputText = ref('');
const selectedModel = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

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

// Configure marked for better rendering
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

// Helper to get branch count for a message
function getBranchCount(nodeId: string): number {
  if (!props.allNodes) return 0;
  return Object.values(props.allNodes).filter(
    node => node.branchMetadata?.sourceNodeId === nodeId
  ).length;
}

// Render markdown content safely
function renderMarkdown(content: string): string {
  const html = marked.parse(content) as string;
  return DOMPurify.sanitize(html);
}

// Group models by provider
const modelsByProvider = computed(() => {
  const providers: Record<string, { name: string; models: LLMModel[] }> = {
    openai: { name: 'OpenAI', models: [] },
    anthropic: { name: 'Anthropic', models: [] },
    google: { name: 'Google', models: [] },
  };

  AVAILABLE_MODELS.forEach((model) => {
    const provider = providers[model.provider];
    if (provider) {
      provider.models.push(model);
    }
  });

  return Object.values(providers);
});

// Initialize with last used model or default to GPT-4o
watch(
  () => props.lastUsedModel,
  (model) => {
    if (model && !selectedModel.value) {
      selectedModel.value = JSON.stringify(model);
    }
  },
  { immediate: true }
);

// Set default model to GPT-4o if none selected
if (!selectedModel.value) {
  const gpt4o = AVAILABLE_MODELS.find(m => m.name === 'gpt-4o');
  if (gpt4o) {
    selectedModel.value = JSON.stringify(gpt4o);
  } else if (AVAILABLE_MODELS.length > 0) {
    // Fallback to first available model if GPT-4o not found
    selectedModel.value = JSON.stringify(AVAILABLE_MODELS[0]);
  }
}

// Watch for model changes and persist to settings
watch(selectedModel, (newModel) => {
  if (newModel) {
    const model = JSON.parse(newModel) as LLMModel;
    // Emit model change so parent can save it
    emit('model-changed', model);
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

function handleKeydown(event: KeyboardEvent) {
  // Handle Enter key
  if (event.key === 'Enter') {
    // Ctrl+Enter or Cmd+Enter: insert newline
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      // Manually insert newline at cursor position
      const textarea = textareaRef.value;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = inputText.value;
        inputText.value = value.substring(0, start) + '\n' + value.substring(end);
        // Restore cursor position after the newline
        nextTick(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        });
      }
      return;
    }
    
    // Plain Enter: send message
    event.preventDefault();
    handleSend();
  }
}

function handleSend() {
  if (inputText.value.trim() && selectedModel.value && canSend.value) {
    const model = JSON.parse(selectedModel.value) as LLMModel;
    
    // Check if we have branch context
    if (branchContext.value.text && branchContext.value.sourceNodeId) {
      // Send as a branch with context
      emit('branch-from-text', branchContext.value.sourceNodeId, branchContext.value.text, inputText.value.trim(), model);
      clearBranchContext();
    } else {
      // Regular message
      emit('send', inputText.value.trim(), model);
    }
    
    inputText.value = '';
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

// Add document click listener
if (typeof window !== 'undefined') {
  // Use capture phase and a small delay to avoid interfering with selection
  setTimeout(() => {
    document.addEventListener('mousedown', handleDocumentClick);
  }, 0);
}
</script>

<style scoped>
.modal-chat-large {
  width: 90vw;
  max-width: 1400px;
  height: 85vh;
  max-height: 900px;
  padding: 0;
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
  border-radius: 6px;
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
