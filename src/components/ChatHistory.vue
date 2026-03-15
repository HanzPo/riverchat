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
            <span v-if="message.state === 'error'" class="error-badge-wrapper relative text-error font-bold flex items-center gap-1">
              <AlertTriangle :size="12" />
              <span>Error</span>
              <span v-if="message.error" class="error-tooltip">{{ message.error }}</span>
            </span>
          </div>
        </div>

        <!-- Multi-model prompt: shown once after first AI response with single model (3B) -->
        <div
          v-if="showMultiModelPrompt"
          class="p-3 rounded-lg text-center animate-fade-in"
          style="background: rgba(13, 153, 255, 0.08); border: 1px solid rgba(13, 153, 255, 0.2);"
        >
          <p class="text-xs font-medium mb-2" style="color: var(--color-primary);">
            Want to see how another AI answers?
          </p>
          <button
            @click="addModelSlot(); multiModelPromptDismissed = true; chatAnalytics.capture('multi_model_prompt_clicked')"
            class="btn-material text-xs"
            style="padding: 5px 12px; font-weight: 600; background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);"
          >
            + Add a second model
          </button>
          <button
            @click="multiModelPromptDismissed = true"
            class="block mx-auto mt-1 text-[10px] bg-transparent border-none cursor-pointer"
            style="color: var(--color-text-tertiary);"
          >
            Dismiss
          </button>
        </div>

        <!-- Post-response upgrade nudge: shown on free tier (2D) -->
        <div
          v-if="showUpgradeNudge"
          class="p-3 rounded-lg animate-fade-in"
          style="background: rgba(162, 89, 255, 0.08); border: 1px solid rgba(162, 89, 255, 0.2);"
        >
          <p class="text-xs font-medium mb-1" style="color: var(--color-accent);">
            This response used {{ lastAIModelName }}.
          </p>
          <p class="text-[11px] mb-2" style="color: var(--color-text-secondary);">
            Try premium models like Claude or GPT-5 with Pro.
          </p>
          <div class="flex items-center gap-2">
            <button
              @click="chatAnalytics.capture('upgrade_prompt_clicked', { source: 'post_response', target_tier: 'pro' }); subscription.upgradeToTier('pro')"
              class="btn-material text-xs"
              style="padding: 5px 12px; font-weight: 600; background: rgba(162, 89, 255, 0.15); color: var(--color-accent); border-color: rgba(162, 89, 255, 0.3);"
            >
              Upgrade to Pro
            </button>
            <button
              @click="upgradeNudgeDismissed = true"
              class="text-[10px] bg-transparent border-none cursor-pointer"
              style="color: var(--color-text-tertiary);"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Web Search Upgrade Popover -->
    <UpgradePopover
      :visible="webSearchUpgrade.visible"
      :position="webSearchUpgrade.position"
      title="Web search"
      description="Search the web during AI responses for up-to-date information."
      target-tier="pro"
      @close="webSearchUpgrade.visible = false"
      @upgrade="(tier: 'pro' | 'max') => { webSearchUpgrade.visible = false; chatAnalytics.capture('upgrade_prompt_clicked', { source: 'web_search', target_tier: tier }); subscription.upgradeToTier(tier); }"
    />

    <!-- Input Area -->
    <div class="p-4 card-material">
      <!-- Resend interface when user node is selected -->
      <div v-if="!canSend && !isNewRootMode && path.length > 0 && selectedUserMessage" class="py-3">
        <!-- Model Selection (Dropdowns) -->
        <div class="mb-2 flex items-center gap-1.5 flex-wrap">
          <button
            @click="canEnableWebSearch ? webSearchEnabled = !webSearchEnabled : null"
            class="flex items-center justify-center rounded-lg transition-all"
            :class="{ 'hover:opacity-80': canEnableWebSearch, 'cursor-not-allowed opacity-50': !canEnableWebSearch }"
            :style="'width: 18px; height: 18px; background: transparent; cursor: ' + (canEnableWebSearch ? 'pointer' : 'not-allowed') + ';'"
            :title="canEnableWebSearch ? (webSearchEnabled ? 'Web search enabled' : 'Web search disabled') : 'Upgrade to use web search'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="webSearchEnabled && canEnableWebSearch ? 'color: var(--color-primary);' : 'color: var(--color-text-tertiary);'">
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

        <!-- User message content (greyed out) -->
        <div class="mb-2 p-3 rounded-lg" style="background: var(--color-background-secondary); border: 1px solid var(--color-border);">
          <div class="text-[13.5px] leading-relaxed break-words whitespace-pre-wrap" style="color: var(--color-text-tertiary); opacity: 0.6;">
            {{ selectedUserMessage.content }}
          </div>
        </div>

        <!-- Resend button -->
        <div class="flex justify-end">
          <button
            @click="handleResend"
            :disabled="selectedModelIds.length === 0 || isSending"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-medium text-xs"
            :style="(selectedModelIds.length === 0 || isSending)
              ? 'background: var(--color-border); color: var(--color-text-tertiary); cursor: not-allowed;'
              : 'background: var(--color-primary); color: white; cursor: pointer;'"
            :title="isSending ? 'Sending...' : (selectedModelIds.length > 1 ? `Resend to ${selectedModelIds.length} models` : 'Resend message')"
          >
            <div v-if="isSending" class="loading-spinner-small"></div>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
            <span>Resend</span>
          </button>
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

         <!-- Model Selection (Dropdowns) -->
         <div class="mb-2 flex items-center gap-1.5 flex-wrap">
           <button
             @click="handleWebSearchClick($event)"
             class="flex items-center justify-center rounded-lg transition-all"
             :class="{ 'hover:opacity-80': canEnableWebSearch, 'cursor-pointer opacity-50 hover:opacity-70': !canEnableWebSearch }"
             :style="'width: 18px; height: 18px; background: transparent; cursor: pointer;'"
             :title="canEnableWebSearch ? (webSearchEnabled ? 'Web search enabled' : 'Web search disabled') : 'Upgrade to use web search'"
           >
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="webSearchEnabled && canEnableWebSearch ? 'color: var(--color-primary);' : 'color: var(--color-text-tertiary);'">
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
             :disabled="!inputText.trim() || !canSend || selectedModelIds.length === 0 || isSending"
             class="flex items-center justify-center rounded-lg transition-all"
             :style="(!inputText.trim() || !canSend || selectedModelIds.length === 0 || isSending)
               ? 'width: 40px; height: 40px; background: var(--color-border); cursor: not-allowed;'
               : 'width: 40px; height: 40px; background: var(--color-primary); cursor: pointer;'"
             :title="isSending ? 'Sending...' : (selectedModelIds.length > 1 ? `Send to ${selectedModelIds.length} models` : 'Send message')"
           >
             <div v-if="isSending" class="loading-spinner-small"></div>
             <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;">
               <path d="M12 19V5M5 12l7-7 7 7"/>
             </svg>
           </button>
         </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { MessageNode, Settings } from '../types';
import { User, Bot, GitBranch, AlertTriangle, X } from 'lucide-vue-next';
import { renderMarkdown, formatTime, getBranchCount } from '../utils/chat';
import TextHighlightPopover from './TextHighlightPopover.vue';
import ModelDropdown from './ModelDropdown.vue';
import UpgradePopover from './UpgradePopover.vue';
import { useChatPanel } from '../composables/useChatPanel';
import { usePostHog } from '../composables/usePostHog';
import type { User as FirebaseUser } from 'firebase/auth';

const chatAnalytics = usePostHog();

interface Props {
  path: MessageNode[];
  selectedNodeId: string | null;
  isNewRootMode?: boolean;
  allNodes?: Record<string, MessageNode>;
  settings?: Settings;
  isSending?: boolean;
  currentUser?: FirebaseUser | null;
}

interface Emits {
  (e: 'send', content: string, models: any[], webSearchEnabled: boolean): void;
  (e: 'node-select', nodeId: string): void;
  (e: 'branch-from-text', nodeId: string, highlightedText: string, elaborationPrompt: string, models: any[], webSearchEnabled: boolean): void;
  (e: 'chat-model-changed', modelIds: string[]): void;
  (e: 'close'): void;
  (e: 'pop-out'): void;
  (e: 'resend', userNodeId: string, models: any[], webSearchEnabled: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Multi-model prompt: show once after first AI response with single model
const multiModelPromptDismissed = ref(false);
const showMultiModelPrompt = computed(() => {
  if (multiModelPromptDismissed.value) return false;
  if (props.settings?.hasSeenMultiModelPrompt) return false;
  // Show after first AI response when user has only 1 model selected
  const hasAIResponse = props.path.some(m => m.type === 'ai' && m.state === 'complete');
  return hasAIResponse && selectedModelIds.value.length === 1;
});

// Post-response upgrade nudge (2D): show on free tier after AI responses
const upgradeNudgeDismissed = ref(false);
const showUpgradeNudge = computed(() => {
  if (upgradeNudgeDismissed.value) return false;
  if (subscription.tier.value !== 'free') return false;
  // Show after the 2nd completed AI response
  const completedAI = props.path.filter(m => m.type === 'ai' && m.state === 'complete');
  return completedAI.length >= 2;
});
const lastAIModelName = computed(() => {
  const aiMessages = props.path.filter(m => m.type === 'ai' && m.state === 'complete');
  return aiMessages.length > 0 ? aiMessages[aiMessages.length - 1]?.model?.name ?? 'this model' : 'this model';
});

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
  { textareaMinHeight: '40px' }
);

// Consolidated autofocus logic - focus textarea when it becomes available
watch(
  [() => props.isNewRootMode, () => props.selectedNodeId, () => props.path, canSend],
  async () => {
    const shouldFocus = props.isNewRootMode || (canSend.value && !props.isNewRootMode && props.path.length > 0);
    if (shouldFocus) {
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
</script>

<style scoped>
@import './chat-panel.css';
</style>
