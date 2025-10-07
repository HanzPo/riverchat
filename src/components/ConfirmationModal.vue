<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content" style="width: 450px; padding: 28px;">
      <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">
        {{ title }}
      </h3>
      <p style="color: var(--text-secondary); font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        {{ message }}
      </p>

      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button @click="emit('close')" class="glass-button">
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          class="glass-button"
          :style="{
            background: isDangerous ? 'rgba(239, 68, 68, 0.2)' : 'rgba(102, 126, 234, 0.3)',
            color: isDangerous ? 'var(--error-color)' : 'var(--text-primary)',
          }"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

interface Emits {
  (e: 'confirm'): void;
  (e: 'close'): void;
}

withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  isDangerous: false,
});

const emit = defineEmits<Emits>();

function handleConfirm() {
  emit('confirm');
  emit('close');
}
</script>

