<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="onBackdropClick">
    <div class="modal-content w-[600px] p-8">
      <div class="mb-6">
        <h1 class="text-[28px] font-bold mb-3 text-white/95">
          Welcome to RiverChat 🌊
        </h1>
        <p class="text-white/80 text-base leading-relaxed font-medium">
          RiverChat is a non-linear chat application that visualizes conversations as branching rivers.
          To get started, please enter at least one API key.
        </p>
      </div>

      <div class="flex flex-col gap-5 mb-6">
        <!-- OpenAI -->
        <div>
          <label class="block mb-2.5 font-semibold text-white/90 text-[13.5px]">
            OpenAI API Key
          </label>
          <input
            v-model="apiKeys.openai"
            type="password"
            placeholder="sk-..."
            class="input-material"
          />
          <p class="text-xs text-white/70 mt-2 font-medium">
            For GPT-4o, GPT-4 Turbo, etc.
          </p>
        </div>

        <!-- Anthropic -->
        <div>
          <label class="block mb-2.5 font-semibold text-white/90 text-[13.5px]">
            Anthropic API Key
          </label>
          <input
            v-model="apiKeys.anthropic"
            type="password"
            placeholder="sk-ant-..."
            class="input-material"
          />
          <p class="text-xs text-white/70 mt-2 font-medium">
            For Claude 3.5 Sonnet, Opus, etc.
          </p>
        </div>

        <!-- Google -->
        <div>
          <label class="block mb-2.5 font-semibold text-white/90 text-[13.5px]">
            Google Gemini API Key
          </label>
          <input
            v-model="apiKeys.google"
            type="password"
            placeholder="AIza..."
            class="input-material"
          />
          <p class="text-xs text-white/70 mt-2 font-medium">
            For Gemini 2.0 Flash, Gemini 1.5 Pro, etc.
          </p>
        </div>
      </div>

      <!-- Security Notice -->
      <div class="bg-info/15 border border-info/40 rounded-lg p-4 mb-6">
        <p class="text-[13.5px] text-white/95 leading-relaxed">
          🔒 <strong class="font-bold">Privacy Note:</strong> Your API keys are stored securely in your browser's local storage
          and are never sent to any server except the selected LLM provider.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          @click="handleSave"
          :disabled="!hasAtLeastOneKey"
          class="btn-material px-6 py-3 text-base font-bold"
        >
          Get Started
        </button>
      </div>

      <p v-if="!hasAtLeastOneKey" class="text-warning text-[13px] text-right mt-2.5 font-semibold">
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
