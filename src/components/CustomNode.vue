<template>
  <div
    class="card-material p-3.5 min-w-[280px] max-w-[320px] cursor-pointer transition-all duration-300 ease-material hover:-translate-y-0.5 hover:shadow-elevation-3"
    :class="{
      'animate-pulse opacity-70': data.state === 'generating',
      'border-error border-2': data.state === 'error',
      'shadow-[0_0_0_3px] shadow-primary/40 border-2 border-primary': selected,
      'bg-primary/20 border-primary/30': data.type === 'user',
      'bg-secondary/20 border-secondary/30': data.type === 'ai',
    }"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- Header -->
    <div class="flex justify-between items-center mb-3 gap-2">
      <span 
        class="text-[10.5px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border"
        :class="data.type === 'user' ? 'bg-primary/30 border-primary/50 text-primary' : 'bg-secondary/30 border-secondary/50 text-secondary'"
      >
        {{ data.type === 'user' ? '👤 USER' : '🤖 AI' }}
      </span>
      <span v-if="data.model" class="text-[11px] font-medium text-white/75 overflow-hidden text-ellipsis whitespace-nowrap">
        {{ data.model.displayName }}
      </span>
    </div>

    <!-- Branch Metadata Badge -->
    <div v-if="data.branchMetadata" class="mb-2.5 p-2 bg-accent/10 border border-accent/30 rounded-md">
      <div class="text-[8px] font-bold text-white/60 uppercase tracking-wider mb-1">Selected Text</div>
      <div class="text-[9px] text-white/70 italic line-clamp-2">
        "{{ data.branchMetadata.highlightedText }}"
      </div>
    </div>

    <!-- Content Preview -->
    <div class="text-white/95 text-[13.5px] leading-relaxed mb-3 break-words whitespace-pre-wrap font-normal">
      {{ truncateContent(data.content) }}
      <span v-if="data.state === 'generating'" class="inline-block animate-blink text-info font-bold">▊</span>
    </div>

    <!-- Error Badge -->
    <div v-if="data.state === 'error'" class="bg-error/25 text-error px-2.5 py-1.5 rounded-md text-xs font-semibold mb-2 text-center border border-error/40">
      ⚠️ Error
    </div>

    <!-- Timestamp -->
    <div class="text-[11px] text-white/70 text-right font-medium">
      {{ formatTime(data.timestamp) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageNode } from '../types';

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
</style>
