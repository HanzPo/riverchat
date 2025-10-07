<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content" style="width: 600px; padding: 32px;">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">
          Settings
        </h2>
        <p style="color: var(--text-secondary); font-size: 14px;">
          Manage your API keys and preferences
        </p>
      </div>

      <!-- Tabs -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px;">
        <button
          @click="activeTab = 'api'"
          class="glass-button"
          :style="{
            background: activeTab === 'api' ? 'var(--glass-bg-hover)' : 'transparent',
            border: activeTab === 'api' ? '1px solid var(--glass-border)' : '1px solid transparent',
          }"
        >
          API Keys
        </button>
        <button
          @click="activeTab = 'appearance'"
          class="glass-button"
          :style="{
            background: activeTab === 'appearance' ? 'var(--glass-bg-hover)' : 'transparent',
            border: activeTab === 'appearance' ? '1px solid var(--glass-border)' : '1px solid transparent',
          }"
        >
          Appearance
        </button>
      </div>

      <!-- API Keys Tab -->
      <div v-if="activeTab === 'api'" style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">
            OpenAI API Key
          </label>
          <input
            v-model="localSettings.apiKeys.openai"
            type="password"
            placeholder="sk-..."
            class="glass-input"
          />
        </div>

        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">
            Anthropic API Key
          </label>
          <input
            v-model="localSettings.apiKeys.anthropic"
            type="password"
            placeholder="sk-ant-..."
            class="glass-input"
          />
        </div>

        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">
            Google Gemini API Key
          </label>
          <input
            v-model="localSettings.apiKeys.google"
            type="password"
            placeholder="AIza..."
            class="glass-input"
          />
        </div>

        <div style="
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          padding: 12px;
        ">
          <p style="font-size: 13px; color: var(--text-primary); line-height: 1.5;">
            🔒 API keys are stored locally in your browser and never sent to any server except the selected LLM provider.
          </p>
        </div>
      </div>

      <!-- Appearance Tab -->
      <div v-if="activeTab === 'appearance'" style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">
            Theme
          </label>
          <select v-model="localSettings.theme" class="glass-select" style="width: 100%; padding: 10px;">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div style="
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        ">
          <p style="color: var(--text-secondary); font-size: 14px;">
            Theme preview
          </p>
          <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: center;">
            <div class="glass" style="width: 60px; height: 60px;"></div>
            <div class="glass" style="width: 60px; height: 60px; background: var(--user-node-bg);"></div>
            <div class="glass" style="width: 60px; height: 60px; background: var(--ai-node-bg);"></div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--glass-border);">
        <button @click="emit('close')" class="glass-button">
          Cancel
        </button>
        <button
          @click="handleSave"
          class="glass-button"
          style="background: rgba(102, 126, 234, 0.3);"
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

const activeTab = ref<'api' | 'appearance'>('api');
const localSettings = ref<Settings>({ ...props.settings });

watch(() => props.settings, (newSettings) => {
  localSettings.value = { ...newSettings };
}, { deep: true });

function handleSave() {
  emit('save', localSettings.value);
}
</script>

