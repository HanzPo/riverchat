<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content w-[900px] max-h-[85vh] p-8 overflow-y-auto">
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-2" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
          Select Models for This Prompt
        </h2>
        <p class="text-sm font-medium" style="color: var(--color-text-secondary);">
          Choose which models to run for your next prompt. Only models enabled in settings are shown.
        </p>
      </div>

      <!-- Search -->
      <div class="mb-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search models..."
          class="input-material"
        />
      </div>

      <!-- Model Grid -->
      <div class="grid grid-cols-2 gap-3 mb-6 max-h-[50vh] overflow-y-auto p-2">
        <div
          v-for="model in filteredModels"
          :key="model.id"
          class="p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50"
          :class="isModelSelected(model) ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'"
          @click="toggleModel(model)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  :checked="isModelSelected(model)"
                  class="w-4 h-4 rounded"
                  style="accent-color: var(--color-primary);"
                  @click.stop="toggleModel(model)"
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
                  💰 ${{ formatPrice(model.pricing.prompt) }}/${{ formatPrice(model.pricing.completion) }}
                </span>
                <span title="Provider">
                  🏢 {{ model.provider }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredModels.length === 0" class="col-span-2 text-center py-8">
          <p class="text-sm" style="color: var(--color-text-tertiary);">
            No models found matching "{{ searchQuery }}"
          </p>
        </div>
      </div>

      <div v-if="enabledModels.length === 0" class="rounded-lg p-4 mb-6" style="background: var(--color-warning-bg); border: 1px solid var(--color-warning);">
        <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
          ⚠️ No models are enabled in settings. Go to Settings to enable models first.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-6" style="border-top: 1px solid var(--color-border);">
        <p class="text-sm font-medium" style="color: var(--color-text-secondary);">
          {{ selectedModels.length }} model{{ selectedModels.length !== 1 ? 's' : '' }} selected
        </p>
        <div class="flex gap-3">
          <button @click="emit('close')" class="btn-material" style="padding: 8px 16px;">
            Cancel
          </button>
          <button
            @click="handleConfirm"
            :disabled="selectedModels.length === 0"
            class="btn-material"
            style="padding: 8px 16px; font-weight: 600; background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);"
            :style="selectedModels.length === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { LLMModel } from '../types';

interface Props {
  isOpen: boolean;
  enabledModels: LLMModel[];
  initialSelectedModels: LLMModel[];
}

interface Emits {
  (e: 'confirm', models: LLMModel[]): void;
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const searchQuery = ref('');
const selectedModels = ref<LLMModel[]>([...props.initialSelectedModels]);

// Watch for changes to initialSelectedModels
watch(() => props.initialSelectedModels, (newModels) => {
  selectedModels.value = [...newModels];
}, { deep: true });

const filteredModels = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.enabledModels;
  }

  const query = searchQuery.value.toLowerCase();
  return props.enabledModels.filter(model =>
    model.name.toLowerCase().includes(query) ||
    model.id.toLowerCase().includes(query) ||
    model.provider.toLowerCase().includes(query) ||
    (model.description && model.description.toLowerCase().includes(query))
  );
});

function isModelSelected(model: LLMModel): boolean {
  return selectedModels.value.some(m => m.id === model.id);
}

function toggleModel(model: LLMModel) {
  const index = selectedModels.value.findIndex(m => m.id === model.id);
  if (index >= 0) {
    selectedModels.value.splice(index, 1);
  } else {
    selectedModels.value.push(model);
  }
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

function handleConfirm() {
  emit('confirm', selectedModels.value);
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
