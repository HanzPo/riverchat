<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="onBackdropClick">
    <div class="modal-content" style="width: 600px; padding: 32px;">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">
          Welcome to RiverChat 🌊
        </h1>
        <p style="color: var(--text-secondary); font-size: 16px; line-height: 1.6;">
          RiverChat is a non-linear chat application that visualizes conversations as branching rivers.
          To get started, please enter at least one API key.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px;">
        <!-- OpenAI -->
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">
            OpenAI API Key
          </label>
          <input
            v-model="apiKeys.openai"
            type="password"
            placeholder="sk-..."
            class="glass-input"
          />
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
            For GPT-4o, GPT-4 Turbo, etc.
          </p>
        </div>

        <!-- Anthropic -->
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">
            Anthropic API Key
          </label>
          <input
            v-model="apiKeys.anthropic"
            type="password"
            placeholder="sk-ant-..."
            class="glass-input"
          />
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
            For Claude 3.5 Sonnet, Opus, etc.
          </p>
        </div>

        <!-- Google -->
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">
            Google Gemini API Key
          </label>
          <input
            v-model="apiKeys.google"
            type="password"
            placeholder="AIza..."
            class="glass-input"
          />
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
            For Gemini 2.0 Flash, Gemini 1.5 Pro, etc.
          </p>
        </div>
      </div>

      <!-- Security Notice -->
      <div style="
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 24px;
      ">
        <p style="font-size: 13px; color: var(--text-primary); line-height: 1.5;">
          🔒 <strong>Privacy Note:</strong> Your API keys are stored securely in your browser's local storage
          and are never sent to any server except the selected LLM provider.
        </p>
      </div>

      <!-- Actions -->
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button
          @click="handleSave"
          :disabled="!hasAtLeastOneKey"
          class="glass-button"
          style="padding: 12px 24px; font-size: 16px; font-weight: 600;"
        >
          Get Started
        </button>
      </div>

      <p v-if="!hasAtLeastOneKey" style="
        color: var(--warning-color);
        font-size: 13px;
        text-align: right;
        margin-top: 8px;
      ">
        Please enter at least one API key to continue
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { APIKeys } from '../types';

interface Props {
  isOpen: boolean;
  canDismiss?: boolean;
}

interface Emits {
  (e: 'save', apiKeys: APIKeys): void;
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  canDismiss: false,
});

const emit = defineEmits<Emits>();

const apiKeys = ref<APIKeys>({
  openai: '',
  anthropic: '',
  google: '',
});

const hasAtLeastOneKey = computed(() => {
  return !!(apiKeys.value.openai || apiKeys.value.anthropic || apiKeys.value.google);
});

function handleSave() {
  if (hasAtLeastOneKey.value) {
    emit('save', apiKeys.value);
  }
}

function onBackdropClick() {
  if (props.canDismiss) {
    emit('close');
  }
}
</script>

