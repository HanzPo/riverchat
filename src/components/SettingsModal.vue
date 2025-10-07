<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content w-[600px] p-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-2 text-white/95">
          Settings
        </h2>
        <p class="text-white/75 text-sm font-medium">
          Manage your API keys and preferences
        </p>
      </div>

      <!-- API Keys -->
      <div class="flex flex-col gap-5">
        <div>
          <label class="block mb-2.5 font-semibold text-white/90 text-[13.5px]">
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
          <label class="block mb-2.5 font-semibold text-white/90 text-[13.5px]">
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
          <label class="block mb-2.5 font-semibold text-white/90 text-[13.5px]">
            Google Gemini API Key
          </label>
          <input
            v-model="localSettings.apiKeys.google"
            type="password"
            placeholder="AIza..."
            class="input-material"
          />
        </div>

        <div class="bg-info/15 border border-info/40 rounded-lg p-4">
          <p class="text-[13.5px] text-white/95 leading-relaxed font-medium">
            🔒 API keys are stored locally in your browser and never sent to any server except the selected LLM provider.
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6 pt-6 border-t border-white/15">
        <button @click="emit('close')" class="btn-material px-5 py-2.5">
          Cancel
        </button>
        <button
          @click="handleSave"
          class="btn-material bg-primary/30 hover:bg-primary/40 px-5 py-2.5 font-bold"
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
