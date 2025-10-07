<template>
  <div v-if="isOpen && message" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content w-[800px] max-h-[80vh] p-8 overflow-y-auto">
      <!-- Header -->
      <div class="flex justify-between items-start mb-5">
        <div>
          <div class="flex items-center gap-2.5 mb-2.5">
            <span
              class="px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider border"
              :class="message.type === 'user' ? 'bg-primary/30 border-primary/50 text-primary' : 'bg-secondary/30 border-secondary/50 text-secondary'"
            >
              {{ message.type === 'user' ? 'USER' : 'AI' }}
            </span>
            <span v-if="message.model" class="text-white/75 text-[13px] font-medium">
              {{ message.model.displayName }}
            </span>
          </div>
          <p class="text-white/70 text-[13px] font-medium">
            {{ formatTimestamp(message.timestamp) }}
          </p>
        </div>

        <button @click="handleCopy" class="btn-material flex items-center gap-1.5 px-4 py-2">
          <span class="font-semibold">{{ copied ? 'Copied!' : 'Copy' }}</span>
        </button>
      </div>

      <!-- Message Content -->
      <div class="card-material p-6 text-white/95 whitespace-pre-wrap break-words leading-relaxed text-[15px] font-sans">
        {{ message.content }}
      </div>

      <!-- Error State -->
      <div
        v-if="message.state === 'error' && message.error"
        class="mt-4 bg-error/20 border border-error/40 rounded-lg p-4"
      >
        <p class="text-error text-[13.5px] font-bold mb-1.5">
          Error:
        </p>
        <p class="text-error text-[13.5px] font-medium">
          {{ message.error }}
        </p>
      </div>

      <!-- Close Button -->
      <div class="flex justify-end mt-6">
        <button @click="emit('close')" class="btn-material px-6 py-2.5">
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
