<template>
  <div
    class="custom-node glass"
    :class="{
      'node-generating': data.state === 'generating',
      'node-error': data.state === 'error',
      'node-selected': selected,
    }"
    :style="{
      background: data.type === 'user' ? 'var(--user-node-bg)' : 'var(--ai-node-bg)',
      opacity: data.state === 'generating' ? 0.7 : 1,
      borderColor: selected ? 'rgba(102, 126, 234, 0.6)' : 'var(--glass-border)',
      borderWidth: selected ? '2px' : '1px',
    }"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- Header -->
    <div class="node-header">
      <span class="node-type-badge" :class="`badge-${data.type}`">
        {{ data.type === 'user' ? '👤 User' : '🤖 AI' }}
      </span>
      <span v-if="data.model" class="node-model">
        {{ data.model.displayName }}
      </span>
    </div>

    <!-- Content Preview -->
    <div class="node-content">
      {{ truncateContent(data.content) }}
      <span v-if="data.state === 'generating'" class="generating-indicator">▊</span>
    </div>

    <!-- Error Badge -->
    <div v-if="data.state === 'error'" class="error-badge">
      ⚠️ Error
    </div>

    <!-- Timestamp -->
    <div class="node-footer">
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
.custom-node {
  padding: 12px;
  min-width: 250px;
  max-width: 300px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.custom-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.25);
}

.node-generating {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.node-error {
  border-color: var(--error-color) !important;
}

.node-selected {
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.node-type-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}

.node-model {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-content {
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 10px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.generating-indicator {
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

.error-badge {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error-color);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: center;
}

.node-footer {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>

