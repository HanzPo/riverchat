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
                <span v-if="message.state === 'error'" class="error-badge-wrapper relative text-error font-bold flex items-center gap-1">
                  <AlertTriangle :size="12" />
                  <span>Error</span>
                  <span v-if="message.error" class="error-tooltip">{{ message.error }}</span>
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
              @click="handleWebSearchClick($event)"
              class="flex items-center justify-center rounded-lg transition-all"
              :class="{ 'hover:opacity-80': canEnableWebSearch, 'cursor-pointer opacity-50 hover:opacity-70': !canEnableWebSearch }"
              :style="'width: 20px; height: 20px; background: transparent; cursor: pointer;'"
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
              @click="handleWebSearchClick($event)"
              class="flex items-center justify-center rounded-lg transition-all"
              :class="{ 'hover:opacity-80': canEnableWebSearch, 'cursor-pointer opacity-50 hover:opacity-70': !canEnableWebSearch }"
              :style="'width: 20px; height: 20px; background: transparent; cursor: pointer;'"
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

    <!-- Web Search Upgrade Popover -->
    <UpgradePopover
      :visible="webSearchUpgrade.visible"
      :position="webSearchUpgrade.position"
      title="Web search"
      description="Search the web during AI responses for up-to-date information."
      target-tier="pro"
      @close="webSearchUpgrade.visible = false"
      @upgrade="(tier: 'pro' | 'max') => { webSearchUpgrade.visible = false; chatModalAnalytics.capture('upgrade_prompt_clicked', { source: 'web_search', target_tier: tier }); subscription.upgradeToTier(tier); }"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, nextTick } from 'vue';
import type { MessageNode, Settings } from '../types';
import { User, Bot, GitBranch, AlertTriangle, X } from 'lucide-vue-next';
import { renderMarkdown, formatTime, getBranchCount } from '../utils/chat';
import TextHighlightPopover from './TextHighlightPopover.vue';
import ModelDropdown from './ModelDropdown.vue';
import UpgradePopover from './UpgradePopover.vue';
import { useChatPanel } from '../composables/useChatPanel';
import { usePostHog } from '../composables/usePostHog';

const chatModalAnalytics = usePostHog();
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
  (e: 'send', content: string, models: any[], webSearchEnabled: boolean): void;
  (e: 'node-select', nodeId: string): void;
  (e: 'branch-from-text', nodeId: string, highlightedText: string, elaborationPrompt: string, models: any[], webSearchEnabled: boolean): void;
  (e: 'chat-model-changed', modelIds: string[]): void;
  (e: 'resend', userNodeId: string, models: any[], webSearchEnabled: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const {
  inputText,
  selectedModelIds,
  messagesContainer,
  textareaRef,
  webSearchEnabled,
  webSearchUpgrade,
  highlightPopover,
  branchContext,
  subscription,
  canEnableWebSearch,
  canSend,
  selectedUserMessage,
  handleWebSearchClick,
  handleModelSelect,
  addModelSlot,
  removeModelSlot,
  autoResizeTextarea,
  handleKeydown,
  handleSend,
  handleResend,
  handleTextSelection,
  handleSetBranchContext,
  clearBranchContext,
} = useChatPanel(
  () => props,
  {
    send: (...args) => emit('send', ...args),
    'branch-from-text': (...args) => emit('branch-from-text', ...args),
    'chat-model-changed': (...args) => emit('chat-model-changed', ...args),
    resend: (...args) => emit('resend', ...args),
  },
  { textareaMinHeight: '44px' }
);

// Autofocus textarea and scroll to bottom when modal opens
watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
          }
          textareaRef.value?.focus();
        });
      });
    }
  },
  { immediate: true }
);
</script>

<style scoped>
@import './chat-panel.css';
</style>
