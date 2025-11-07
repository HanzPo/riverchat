<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="onBackdropClick">
    <div class="modal-content w-[600px] p-8">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold mb-3" style="color: var(--color-text-primary); letter-spacing: -0.02em;">
          Welcome to RiverChat 🌊
        </h1>
        <p class="text-sm leading-relaxed font-medium mb-4" style="color: var(--color-text-secondary);">
          RiverChat is a non-linear chat application that visualizes conversations as branching rivers.
          Each conversation can branch into multiple paths, creating a tree-like structure of ideas.
        </p>

        <div class="rounded-lg p-4" style="background: var(--color-success-bg); border: 1px solid var(--color-success);">
          <p class="text-sm leading-relaxed font-semibold mb-2" style="color: var(--color-text-primary);">
            🎉 Start Using RiverChat Right Away!
          </p>
          <p class="text-xs leading-relaxed" style="color: var(--color-text-secondary);">
            You can start chatting immediately using our <strong>shared API key</strong> with access to free models.
            No API keys required! Simply close this modal and create your first river.
          </p>
        </div>
      </div>

      <div class="mb-4">
        <h2 class="text-base font-semibold mb-2" style="color: var(--color-text-primary);">
          Want Access to All Models? Add Your OpenRouter API Key (Optional)
        </h2>
        <p class="text-xs leading-relaxed font-medium mb-4" style="color: var(--color-text-secondary);">
          With your own OpenRouter API key, you can access hundreds of models from OpenAI, Anthropic, Google, and more.
          Get your key at <a href="https://openrouter.ai/keys" target="_blank" class="underline font-semibold" style="color: var(--color-primary);" rel="noopener noreferrer">openrouter.ai/keys</a>
        </p>
      </div>

      <div class="flex flex-col gap-5 mb-6">
        <!-- OpenRouter -->
        <div>
          <label class="block mb-2 font-medium text-xs" style="color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
            OpenRouter API Key
          </label>
          <input
            v-model="apiKeys.openrouter"
            type="password"
            placeholder="sk-or-v1-..."
            class="input-material"
          />
          <p class="text-xs mt-2 font-medium" style="color: var(--color-text-tertiary);">
            Access to GPT-4, Claude, Gemini, and hundreds of other models
          </p>
        </div>
      </div>

      <!-- Security Notice -->
      <div class="rounded-lg p-4 mb-6" style="background: var(--color-info-bg); border: 1px solid var(--color-info);">
        <p class="text-xs leading-relaxed" style="color: var(--color-text-primary);">
          🔒 <strong class="font-semibold">Privacy Note:</strong> Your API keys are encrypted and synced with your account.
          They are never sent to any server except OpenRouter.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          @click="handleSave"
          class="btn-material"
          style="padding: 10px 24px; font-weight: 600; font-size: 14px; background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);"
        >
          Get Started
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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
  openrouter: '',
});

function handleSave() {
  emit('save', apiKeys.value);
}

function onBackdropClick() {
  if (props.canDismiss) {
    emit('close');
  }
}
</script>
