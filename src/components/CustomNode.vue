<template>
  <div
    class="card-material p-3.5 min-w-[280px] max-w-[320px] cursor-pointer transition-all duration-300 ease-material hover:-translate-y-0.5 hover:shadow-elevation-3"
    :class="{
      'animate-pulse opacity-70': data.state === 'generating',
      'border-error border-2': data.state === 'error',
      'selected-node': selected,
      'bg-primary/20 border-primary/30': data.type === 'user',
      'bg-secondary/20 border-secondary/30': data.type === 'ai',
    }"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- Header -->
    <div class="flex justify-between items-center mb-2.5 gap-2">
      <span
        class="text-[10px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wide flex items-center gap-1.5"
        :style="data.type === 'user'
          ? 'background: var(--color-primary-muted); color: var(--color-primary); border: 1px solid var(--color-primary);'
          : 'background: rgba(162, 89, 255, 0.1); color: var(--color-accent); border: 1px solid var(--color-accent);'"
      >
        <User v-if="data.type === 'user'" :size="11" />
        <Bot v-else :size="11" />
        <span>{{ data.type === 'user' ? 'USER' : 'AI' }}</span>
      </span>
      <span v-if="data.model" class="text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap" style="color: var(--color-text-secondary);">
        {{ data.model.name }}
      </span>
    </div>

    <!-- Branch Metadata Badge -->
    <div v-if="data.branchMetadata" class="mb-2.5 p-2 rounded-lg" style="background: rgba(162, 89, 255, 0.1); border: 1px solid rgba(162, 89, 255, 0.3);">
      <div class="text-[8px] font-semibold uppercase tracking-wider mb-1" style="color: var(--color-text-tertiary);">Selected Text</div>
      <div class="text-[9px] italic line-clamp-2" style="color: var(--color-text-secondary);">
        "{{ data.branchMetadata.highlightedText }}"
      </div>
    </div>

    <!-- Content Preview -->
    <div class="text-sm leading-relaxed mb-2.5 break-words whitespace-pre-wrap font-normal" style="color: var(--color-text-primary);">
      {{ truncateContent(data.content) }}
      <span v-if="data.state === 'generating'" class="inline-block animate-blink font-bold" style="color: var(--color-primary);">▊</span>
    </div>

    <!-- Error Badge -->
    <div v-if="data.state === 'error'" class="px-2.5 py-1.5 rounded-md text-xs font-semibold mb-2 text-center flex items-center justify-center gap-1.5" style="background: var(--color-error-bg); color: var(--color-error); border: 1px solid var(--color-error);">
      <AlertTriangle :size="12" />
      <span>Error</span>
    </div>

    <!-- Timestamp -->
    <div class="text-xs text-right font-medium" style="color: var(--color-text-tertiary);">
      {{ formatTime(data.timestamp) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageNode } from '../types';
import { User, Bot, AlertTriangle } from 'lucide-vue-next';

interface Props {
  data: MessageNode;
  selected?: boolean;
}

interface Emits {
  (e: 'click', node: MessageNode): void;
  (e: 'double-click', node: MessageNode): void;
  (e: 'context-menu', event: MouseEvent, node: MessageNode): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function truncateContent(content: string): string {
  const maxLength = 150;
  if (content.length <= maxLength) return content || '...';
  return content.substring(0, maxLength) + '...';
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function handleClick() {
  emit('click', props.data);
}

function handleDoubleClick() {
  emit('double-click', props.data);
}

function handleContextMenu(event: MouseEvent) {
  emit('context-menu', event, props.data);
}
</script>

<style scoped>
/* Override card-material to use consistent 2px border to prevent text reflow */
.card-material {
  border-width: 2px !important;
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

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Selected node styling - prominent outline with consistent border width */
.selected-node {
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 4px var(--color-primary-muted),
              0 4px 12px rgba(13, 153, 255, 0.3) !important;
  outline: none;
}
</style>
