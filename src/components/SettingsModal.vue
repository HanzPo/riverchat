<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content w-[600px] p-8">
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-2" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
          Settings
        </h2>
        <p class="text-sm font-medium" style="color: var(--color-text-secondary);">
          Manage your API keys and preferences
        </p>
      </div>

      <!-- API Keys -->
      <div class="flex flex-col gap-5">
        <div>
          <label class="block mb-2 font-medium text-xs" style="color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
            OpenAI API Key
          </label>
          <input
            v-model="localSettings.apiKeys.openai"
            type="password"
            placeholder="sk-..."
            class="input-material"
          />
        </div>

        <div>
          <label class="block mb-2 font-medium text-xs" style="color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
            Anthropic API Key
          </label>
          <input
            v-model="localSettings.apiKeys.anthropic"
            type="password"
            placeholder="sk-ant-..."
            class="input-material"
          />
        </div>

        <div>
          <label class="block mb-2 font-medium text-xs" style="color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
            Google Gemini API Key
          </label>
          <input
            v-model="localSettings.apiKeys.google"
            type="password"
            placeholder="AIza..."
            class="input-material"
          />
        </div>

        <div class="rounded-lg p-4" style="background: var(--color-info-bg); border: 1px solid var(--color-info);">
          <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
            🔒 API keys are stored locally in your browser and never sent to any server except the selected LLM provider.
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6 pt-6" style="border-top: 1px solid var(--color-border);">
        <button @click="emit('close')" class="btn-material" style="padding: 8px 16px;">
          Cancel
        </button>
        <button
          @click="handleSave"
          class="btn-material"
          style="padding: 8px 16px; font-weight: 600; background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Settings } from '../types';

interface Props {
  isOpen: boolean;
  settings: Settings;
}

interface Emits {
  (e: 'save', settings: Settings): void;
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localSettings = ref<Settings>({ ...props.settings });

watch(() => props.settings, (newSettings) => {
  localSettings.value = { ...newSettings };
}, { deep: true });

function handleSave() {
  emit('save', localSettings.value);
}
</script>
