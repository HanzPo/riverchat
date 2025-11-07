<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content w-[800px] max-h-[90vh] p-8 overflow-y-auto">
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-2" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
          Settings
        </h2>
        <p class="text-sm font-medium" style="color: var(--color-text-secondary);">
          Manage your OpenRouter API key and model preferences
        </p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6" style="border-bottom: 1px solid var(--color-border);">
        <button
          @click="activeTab = 'api-keys'"
          class="px-4 py-2 text-sm font-semibold transition-all"
          :class="activeTab === 'api-keys' ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-primary'"
        >
          API Key
        </button>
        <button
          @click="activeTab = 'models'"
          class="px-4 py-2 text-sm font-semibold transition-all"
          :class="activeTab === 'models' ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-primary'"
        >
          Enabled Models ({{ enabledCount }})
        </button>
      </div>

      <!-- API Key Tab -->
      <div v-if="activeTab === 'api-keys'" class="flex flex-col gap-5">
        <div>
          <label class="block mb-2 font-medium text-xs" style="color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
            OpenRouter API Key
          </label>
          <input
            v-model="localSettings.apiKeys.openrouter"
            type="password"
            placeholder="sk-or-v1-..."
            class="input-material"
          />
          <p class="text-xs mt-2" style="color: var(--color-text-tertiary);">
            Don't have an API key? Get one at <a href="https://openrouter.ai/keys" target="_blank" class="text-primary hover:underline">openrouter.ai/keys</a>
          </p>
        </div>

        <div class="rounded-lg p-4" style="background: var(--color-info-bg); border: 1px solid var(--color-info);">
          <p class="text-xs leading-relaxed font-medium mb-2" style="color: var(--color-text-primary);">
            🔒 Your API key is encrypted and synced with your account. It's never sent to any server except OpenRouter.
          </p>
          <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
            💡 If no API key is provided, a shared key will be used with access to free models only.
          </p>
        </div>
      </div>

      <!-- Models Tab -->
      <div v-if="activeTab === 'models'" class="flex flex-col gap-4">
        <div>
          <p class="text-sm font-medium mb-3" style="color: var(--color-text-secondary);">
            Select which models appear as options in the chat interface.
            {{ isUsingSharedKey ? ' (Free models only with shared key)' : '' }}
          </p>

          <!-- Search -->
          <div class="mb-4">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search models by name or provider..."
              class="input-material"
            />
          </div>

          <!-- Model Grid -->
          <div class="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto p-2">
            <div
              v-for="model in filteredModels"
              :key="model.id"
              class="p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50"
              :class="localSettings.enabledModels[model.id] ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'"
              @click="toggleModel(model.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      :checked="localSettings.enabledModels[model.id]"
                      class="w-4 h-4 rounded"
                      style="accent-color: var(--color-primary);"
                      @click.stop="toggleModel(model.id)"
                    />
                    <h4 class="text-sm font-bold truncate" style="color: var(--color-text-primary);">
                      {{ model.name }}
                    </h4>
                    <span v-if="model.isFree" class="text-xs font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                      FREE
                    </span>
                  </div>
                  <p class="text-xs mb-2 truncate" style="color: var(--color-text-tertiary);">
                    {{ model.id }}
                  </p>
                  <p v-if="model.description" class="text-xs mb-2 line-clamp-2" style="color: var(--color-text-secondary);">
                    {{ model.description }}
                  </p>
                  <div class="flex flex-wrap gap-3 text-xs" style="color: var(--color-text-tertiary);">
                    <span title="Context Length">
                      📝 {{ formatContextLength(model.contextLength) }}
                    </span>
                    <span v-if="!model.isFree" title="Pricing">
                      💰 ${{ formatPrice(model.pricing.prompt) }}/${{ formatPrice(model.pricing.completion) }} per 1M tokens
                    </span>
                    <span title="Provider">
                      🏢 {{ model.provider }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="filteredModels.length === 0" class="text-center py-8">
              <p class="text-sm" style="color: var(--color-text-tertiary);">
                No models found matching "{{ searchQuery }}"
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-lg p-4" style="background: var(--color-info-bg); border: 1px solid var(--color-info);">
          <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
            💡 Only checked models will be available in the chat interface. Your selection in the chat will persist across prompts.
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
import { ref, watch, computed } from 'vue';
import type { Settings, APIKeys } from '../types';
import { SHARED_OPENROUTER_API_KEY } from '../types';

interface Props {
  isOpen: boolean;
  settings: Settings;
  apiKeys: APIKeys;
}

interface Emits {
  (e: 'save', settings: Settings): void;
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const activeTab = ref<'api-keys' | 'models'>('api-keys');
const localSettings = ref<Settings>({ ...props.settings });
const searchQuery = ref('');

// Initialize localSettings from props
watch(() => props.settings, (newSettings) => {
  localSettings.value = {
    ...newSettings,
    // Deep clone enabledModels to avoid mutation
    enabledModels: { ...newSettings.enabledModels },
    availableModels: newSettings.availableModels ? [...newSettings.availableModels] : []
  };
}, { deep: true, immediate: true });

// Check if using shared key
const isUsingSharedKey = computed(() => {
  return !localSettings.value.apiKeys.openrouter ||
         localSettings.value.apiKeys.openrouter === SHARED_OPENROUTER_API_KEY;
});

// Count enabled models
const enabledCount = computed(() => {
  return Object.values(localSettings.value.enabledModels).filter(v => v === true).length;
});

// Filter models by search query
const filteredModels = computed(() => {
  const availableModels = localSettings.value.availableModels || [];
  if (!searchQuery.value.trim()) {
    return availableModels;
  }

  const query = searchQuery.value.toLowerCase();
  return availableModels.filter(model =>
    model.name.toLowerCase().includes(query) ||
    model.id.toLowerCase().includes(query) ||
    model.provider.toLowerCase().includes(query) ||
    (model.description && model.description.toLowerCase().includes(query))
  );
});

function toggleModel(modelId: string) {
  localSettings.value.enabledModels[modelId] = !localSettings.value.enabledModels[modelId];
}

function formatContextLength(length: number): string {
  if (length >= 1000000) {
    return `${(length / 1000000).toFixed(1)}M`;
  } else if (length >= 1000) {
    return `${(length / 1000).toFixed(0)}K`;
  }
  return length.toString();
}

function formatPrice(price: number): string {
  if (price === 0) return '0';
  if (price < 0.01) return price.toFixed(4);
  if (price < 1) return price.toFixed(2);
  return price.toFixed(2);
}

function handleSave() {
  console.log('[SettingsModal] handleSave - emitting settings:', {
    hasAPIKeys: !!localSettings.value.apiKeys.openrouter,
    apiKeys: {
      openrouter: localSettings.value.apiKeys.openrouter ? `${localSettings.value.apiKeys.openrouter.substring(0, 10)}...` : 'empty'
    },
    enabledModelsCount: Object.values(localSettings.value.enabledModels).filter(v => v === true).length
  });

  emit('save', localSettings.value);
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
