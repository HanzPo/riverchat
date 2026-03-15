<template>
  <Teleport to="body">
    <transition name="tooltip-fade">
      <div
        v-if="visible && tip"
        class="fixed z-[90] flex items-start gap-2.5 px-4 py-3 rounded-lg shadow-xl max-w-xs animate-fade-in"
        :style="{ top: y + 'px', left: x + 'px', background: 'var(--color-background)', border: '1px solid var(--color-primary)', boxShadow: '0 0 12px rgba(13, 153, 255, 0.15)' }"
      >
        <div class="flex-1">
          <p class="text-xs font-medium leading-relaxed" style="color: var(--color-text-primary);">
            {{ tip.message }}
          </p>
        </div>
        <button
          @click="$emit('dismiss', tip.id)"
          class="shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
          style="color: var(--color-text-secondary);"
          title="Got it"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { TourTip } from '../composables/useOnboardingTour';

defineProps<{
  visible: boolean;
  tip: TourTip | null;
  x: number;
  y: number;
}>();

defineEmits<{
  (e: 'dismiss', tipId: string): void;
}>();
</script>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
