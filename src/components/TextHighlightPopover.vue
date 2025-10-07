<template>
  <div
    v-if="visible"
    class="text-highlight-popover"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
    }"
  >
    <button
      class="popover-button"
      @click.stop="$emit('branch')"
      @mousedown.stop
      title="Create a new branch with this text as context"
    >
      <span class="icon">🌿</span>
      <span class="label">Branch with Selection</span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean;
  position: { x: number; y: number };
}

interface Emits {
  (e: 'branch'): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<style scoped>
.text-highlight-popover {
  position: fixed;
  z-index: 10000;
  display: flex;
  gap: 4px;
  background: rgba(10, 10, 10, 0.98);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6),
              0 0 0 1px rgba(255, 255, 255, 0.1);
  animation: popover-appear 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(-100%) translateY(-12px);
}

@keyframes popover-appear {
  from {
    opacity: 0;
    transform: translateY(-100%) translateY(-6px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(-100%) translateY(-12px) scale(1);
  }
}

.popover-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(74, 158, 255, 0.15);
  border: 1px solid rgba(74, 158, 255, 0.3);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.popover-button:hover {
  background: rgba(74, 158, 255, 0.25);
  border-color: rgba(74, 158, 255, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.popover-button:active {
  transform: translateY(0);
}

.popover-button .icon {
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popover-button .label {
  font-weight: 700;
  letter-spacing: 0.02em;
}
</style>

