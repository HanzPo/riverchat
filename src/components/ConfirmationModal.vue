<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content w-[450px] p-7">
      <h3 class="text-lg font-semibold mb-3" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
        {{ title }}
      </h3>
      <p class="text-sm leading-relaxed mb-6 font-medium" style="color: var(--color-text-secondary);">
        {{ message }}
      </p>

      <div class="flex justify-end gap-3">
        <button @click="emit('close')" class="btn-material" style="padding: 8px 16px;">
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          class="btn-material"
          :style="isDangerous 
            ? 'padding: 8px 16px; font-weight: 600; background: var(--color-error-bg); color: var(--color-error); border-color: var(--color-error);' 
            : 'padding: 8px 16px; font-weight: 600; background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);'"
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
