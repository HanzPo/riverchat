<template>
  <div v-if="isOpen && message" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content" style="width: 800px; max-height: 80vh; padding: 32px; overflow-y: auto;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span
              style="
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
              "
              :style="{
                background: message.type === 'user' ? 'var(--user-node-bg)' : 'var(--ai-node-bg)',
                color: 'var(--text-primary)',
              }"
            >
              {{ message.type === 'user' ? 'User' : 'AI' }}
            </span>
            <span v-if="message.model" style="color: var(--text-secondary); font-size: 13px;">
              {{ message.model.displayName }}
            </span>
          </div>
          <p style="color: var(--text-secondary); font-size: 13px;">
            {{ formatTimestamp(message.timestamp) }}
          </p>
        </div>

        <button @click="handleCopy" class="glass-button" style="display: flex; align-items: center; gap: 6px;">
          <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
        </button>
      </div>

      <!-- Message Content -->
      <div style="
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: 8px;
        padding: 20px;
        color: var(--text-primary);
        white-space: pre-wrap;
        word-wrap: break-word;
        line-height: 1.6;
        font-size: 15px;
        font-family: 'Inter', sans-serif;
      ">
        {{ message.content }}
      </div>

      <!-- Error State -->
      <div
        v-if="message.state === 'error' && message.error"
        style="
          margin-top: 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 12px;
        "
      >
        <p style="color: var(--error-color); font-size: 13px; font-weight: 600; margin-bottom: 4px;">
          Error:
        </p>
        <p style="color: var(--error-color); font-size: 13px;">
          {{ message.error }}
        </p>
      </div>

      <!-- Close Button -->
      <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
        <button @click="emit('close')" class="glass-button">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { MessageNode } from '../types';

interface Props {
  isOpen: boolean;
  message: MessageNode | null;
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const copied = ref(false);

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function handleCopy() {
  if (props.message) {
    navigator.clipboard.writeText(props.message.content);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}
</script>

