<template>
  <div class="chat-history">
    <!-- Header -->
    <div class="chat-header glass">
      <h2 style="font-size: 18px; font-weight: 700; color: var(--text-primary);">
        Chat History
      </h2>
      <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
        {{ path.length }} message{{ path.length !== 1 ? 's' : '' }} in this branch
      </p>
    </div>

    <!-- Messages -->
    <div class="messages-container">
      <div v-if="path.length === 0" class="empty-state">
        <p style="color: var(--text-secondary); font-size: 14px; text-align: center;">
          Select a node to view its conversation path
        </p>
      </div>

      <div v-else class="messages-list">
        <div
          v-for="message in path"
          :key="message.id"
          class="message-item glass"
          :class="{
            'message-user': message.type === 'user',
            'message-ai': message.type === 'ai',
            'message-selected': message.id === selectedNodeId,
          }"
          @click="$emit('node-select', message.id)"
        >
          <!-- Header -->
          <div class="message-header">
            <span class="message-badge" :class="`badge-${message.type}`">
              {{ message.type === 'user' ? '👤 You' : '🤖 AI' }}
            </span>
            <span v-if="message.model" class="message-model">
              {{ message.model.displayName }}
            </span>
          </div>

          <!-- Content -->
          <div class="message-content">
            {{ message.content || '...' }}
            <span v-if="message.state === 'generating'" class="generating-cursor">▊</span>
          </div>

          <!-- Footer -->
          <div class="message-footer">
            <span class="message-time">
              {{ formatTime(message.timestamp) }}
            </span>
            <span v-if="message.state === 'error'" class="message-error">
              ⚠️ Error
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-area glass">
      <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
        <select v-model="selectedModel" class="glass-select" style="flex: 1; padding: 8px;">
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
        v-model="inputText"
        class="glass-textarea"
        placeholder="Type your message... (Ctrl+Enter to send)"
        rows="3"
        @keydown.ctrl.enter="handleSend"
        @keydown.meta.enter="handleSend"
      ></textarea>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
        <button
          @click="handleSend"
          :disabled="!inputText.trim() || !canSend"
          class="glass-button"
          style="padding: 8px 16px; font-weight: 600;"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MessageNode, LLMModel } from '../types';
import { AVAILABLE_MODELS } from '../types';

interface Props {
  path: MessageNode[];
  selectedNodeId: string | null;
  lastUsedModel: LLMModel | null;
}

interface Emits {
  (e: 'send', content: string, model: LLMModel): void;
  (e: 'node-select', nodeId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const inputText = ref('');
const selectedModel = ref('');

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
  return props.path.length === 0 || props.path[props.path.length - 1]?.type === 'ai';
});

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
.chat-history {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid var(--glass-border);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.message-item:hover {
  transform: translateX(-4px);
}

.message-user {
  background: var(--user-node-bg);
}

.message-ai {
  background: var(--ai-node-bg);
}

.message-selected {
  border: 2px solid rgba(102, 126, 234, 0.6);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.message-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}

.message-model {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-content {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 8px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.generating-cursor {
  display: inline-block;
  animation: blink 1s step-start infinite;
  color: var(--info-color);
  font-weight: bold;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--text-secondary);
}

.message-error {
  color: var(--error-color);
  font-weight: 600;
}

.input-area {
  padding: 16px;
  border-top: 1px solid var(--glass-border);
}

/* Scrollbar styling for messages */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--glass-bg);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--glass-bg-hover);
}
</style>

