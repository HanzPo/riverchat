<template>
  <div class="flex flex-col h-full bg-background-paper">
    <!-- Header -->
    <div class="p-5 border-b border-white/15 card-material">
      <h2 class="text-lg font-bold text-white/95">
        {{ isNewRootMode ? 'New Conversation Thread' : 'Chat History' }}
      </h2>
      <p class="text-xs text-white/70 mt-1.5 font-medium">
        {{ isNewRootMode ? 'Start a new root conversation' : `${path.length} message${path.length !== 1 ? 's' : ''} in this branch` }}
      </p>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4">
      <div v-if="path.length === 0 && !isNewRootMode" class="flex items-center justify-center h-full px-5 py-10">
        <p class="text-white/70 text-sm text-center font-medium">
          Type a message into the chat to create a new thread
        </p>
      </div>

      <div v-if="isNewRootMode" class="flex items-center justify-center h-full px-5 py-10">
        <div class="text-center">
          <div class="text-4xl mb-4">🌊</div>
          <p class="text-white/90 text-base font-bold mb-2">
            Start a New Thread
          </p>
          <p class="text-white/70 text-sm font-medium">
            This will create a new root conversation node. Type your message below to begin.
          </p>
        </div>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="message in path"
          :key="message.id"
          class="p-3.5 cursor-pointer transition-all duration-200 ease-material rounded-lg card-material hover:-translate-x-1"
          :class="{
            'bg-primary/20 border-primary/40': message.type === 'user',
            'bg-secondary/20 border-secondary/40': message.type === 'ai',
            'border-2 border-primary shadow-[0_0_0_3px] shadow-primary/30': message.id === selectedNodeId,
          }"
          @click="$emit('node-select', message.id)"
        >
          <!-- Header -->
          <div class="flex justify-between items-center mb-2.5 gap-2">
            <span 
              class="text-[10.5px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border"
              :class="message.type === 'user' ? 'bg-primary/30 border-primary/50 text-primary' : 'bg-secondary/30 border-secondary/50 text-secondary'"
            >
              {{ message.type === 'user' ? '👤 YOU' : '🤖 AI' }}
            </span>
            <span v-if="message.model" class="text-[11px] font-medium text-white/75 overflow-hidden text-ellipsis whitespace-nowrap">
              {{ message.model.displayName }}
            </span>
          </div>

          <!-- Content -->
          <div class="text-white/95 text-[13.5px] leading-relaxed mb-2.5 break-words markdown-content">
            <div v-html="renderMarkdown(message.content || '...')"></div>
            <span v-if="message.state === 'generating'" class="inline-block animate-blink text-info font-bold">▊</span>
          </div>

          <!-- Footer -->
          <div class="flex justify-between items-center text-[11px] text-white/70">
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
    <div class="p-4 border-t border-white/15 card-material">
      <div class="flex gap-2 mb-3 items-center">
        <select v-model="selectedModel" class="select-material flex-1 py-2.5">
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
        class="textarea-material text-[13.5px]"
        placeholder="Type your message... (Ctrl+Enter to send)"
        rows="3"
        @keydown.ctrl.enter="handleSend"
        @keydown.meta.enter="handleSend"
      ></textarea>

      <div class="flex justify-end gap-2 mt-3">
        <button
          @click="handleSend"
          :disabled="!inputText.trim() || !canSend"
          class="btn-material px-5 py-2.5 font-bold"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { MessageNode, LLMModel } from '../types';
import { AVAILABLE_MODELS } from '../types';

interface Props {
  path: MessageNode[];
  selectedNodeId: string | null;
  lastUsedModel: LLMModel | null;
  isNewRootMode?: boolean;
}

interface Emits {
  (e: 'send', content: string, model: LLMModel): void;
  (e: 'node-select', nodeId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const inputText = ref('');
const selectedModel = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Configure marked for better rendering
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

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

// Initialize with last used model
watch(
  () => props.lastUsedModel,
  (model) => {
    if (model && !selectedModel.value) {
      selectedModel.value = JSON.stringify(model);
    }
  },
  { immediate: true }
);

// Set default model if none selected
if (!selectedModel.value && AVAILABLE_MODELS.length > 0) {
  selectedModel.value = JSON.stringify(AVAILABLE_MODELS[0]);
}

const canSend = computed(() => {
  return props.isNewRootMode || props.path.length === 0 || props.path[props.path.length - 1]?.type === 'ai';
});

// Scroll to bottom when path changes
watch(
  () => props.path,
  async () => {
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  },
  { immediate: true, deep: true }
);

// Autofocus textarea when entering new root mode
watch(
  () => props.isNewRootMode,
  async (isNewRootMode) => {
    if (isNewRootMode) {
      await nextTick();
      textareaRef.value?.focus();
    }
  },
  { immediate: true }
);

function handleSend() {
  if (inputText.value.trim() && selectedModel.value && canSend.value) {
    const model = JSON.parse(selectedModel.value) as LLMModel;
    emit('send', inputText.value.trim(), model);
    inputText.value = '';
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
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
</style>
