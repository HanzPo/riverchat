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
      <div class="card-material p-6 text-white/95 break-words leading-relaxed text-[15px] font-sans markdown-content">
        <div v-html="renderMarkdown(message.content)"></div>
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
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { MessageNode } from '../types';

// Configure marked for better rendering
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

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

// Render markdown content safely
function renderMarkdown(content: string): string {
  const html = marked.parse(content) as string;
  return DOMPurify.sanitize(html);
}

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

<style scoped>
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
