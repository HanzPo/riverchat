<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content w-[450px] p-7">
      <h3 class="text-xl font-bold mb-3 text-white/95">
        {{ title }}
      </h3>
      <p class="text-white/80 text-[15px] leading-relaxed mb-6 font-medium">
        {{ message }}
      </p>

      <div class="flex justify-end gap-3">
        <button @click="emit('close')" class="btn-material px-5 py-2.5">
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          class="btn-material px-5 py-2.5 font-bold"
          :class="isDangerous ? 'bg-error/25 text-error hover:bg-error/35 border-error/40' : 'bg-primary/30 text-white/95 hover:bg-primary/40'"
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
