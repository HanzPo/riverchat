<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="onBackdropClick">
    <div class="modal-content w-[600px] p-8">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold mb-3" style="color: var(--color-text-primary); letter-spacing: -0.02em;">
          Welcome to RiverChat 🌊
        </h1>
        <p class="text-sm leading-relaxed font-medium" style="color: var(--color-text-secondary);">
          RiverChat is a non-linear chat application that visualizes conversations as branching rivers.
          To get started, please enter at least one API key.
        </p>
      </div>

      <div class="flex flex-col gap-5 mb-6">
        <!-- OpenAI -->
        <div>
          <label class="block mb-2 font-medium text-xs" style="color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
            OpenAI API Key
          </label>
          <input
            v-model="apiKeys.openai"
            type="password"
            placeholder="sk-..."
            class="input-material"
          />
          <p class="text-xs mt-2 font-medium" style="color: var(--color-text-tertiary);">
            For GPT-4o, GPT-4 Turbo, etc.
          </p>
        </div>

        <!-- Anthropic -->
        <div>
          <label class="block mb-2 font-medium text-xs" style="color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
            Anthropic API Key
          </label>
          <input
            v-model="apiKeys.anthropic"
            type="password"
            placeholder="sk-ant-..."
            class="input-material"
          />
          <p class="text-xs mt-2 font-medium" style="color: var(--color-text-tertiary);">
            For Claude 3.5 Sonnet, Opus, etc.
          </p>
        </div>

        <!-- Google -->
        <div>
          <label class="block mb-2 font-medium text-xs" style="color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
            Google Gemini API Key
          </label>
          <input
            v-model="apiKeys.google"
            type="password"
            placeholder="AIza..."
            class="input-material"
          />
          <p class="text-xs mt-2 font-medium" style="color: var(--color-text-tertiary);">
            For Gemini 2.0 Flash, Gemini 1.5 Pro, etc.
          </p>
        </div>
      </div>

      <!-- Security Notice -->
      <div class="rounded-lg p-4 mb-6" style="background: var(--color-info-bg); border: 1px solid var(--color-info);">
        <p class="text-xs leading-relaxed" style="color: var(--color-text-primary);">
          🔒 <strong class="font-semibold">Privacy Note:</strong> Your API keys are stored securely in your browser's local storage
          and are never sent to any server except the selected LLM provider.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          @click="handleSave"
          :disabled="!hasAtLeastOneKey"
          class="btn-material"
          style="padding: 10px 24px; font-weight: 600; font-size: 14px; background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);"
        >
          Get Started
        </button>
      </div>

      <p v-if="!hasAtLeastOneKey" class="text-xs text-right mt-2.5 font-semibold" style="color: var(--color-warning);">
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
