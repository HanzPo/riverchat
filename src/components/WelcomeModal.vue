<template>
  <div v-if="isOpen" class="modal-backdrop z-[200]" @click.self="onBackdropClick">
    <div class="modal-content w-[440px] p-8 text-center">
      <!-- Balance hero -->
      <div class="mb-1">
        <div class="text-4xl font-bold mb-1" style="color: var(--color-success); letter-spacing: -0.03em;">
          $2.00
        </div>
        <p class="text-xs font-medium" style="color: var(--color-text-secondary);">
          free credits added to your account
        </p>
      </div>

      <div class="my-5" style="border-top: 1px solid var(--color-border);"></div>

      <h1 class="text-lg font-semibold mb-2" style="color: var(--color-text-primary); letter-spacing: -0.02em;">
        Your AI conversations, visualized.
      </h1>
      <p class="text-xs leading-relaxed mb-6" style="color: var(--color-text-secondary);">
        Branch, compare, and explore ideas across models. No sign-up needed.
      </p>

      <!-- CTA -->
      <button
        @click="emit('close')"
        class="btn-material w-full mb-3"
        style="padding: 12px 24px; font-weight: 700; font-size: 14px; background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);"
      >
        Start chatting
      </button>
      <p class="text-[11px]" style="color: var(--color-text-tertiary);">
        Credits refresh monthly. Sign up anytime to keep your conversations.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean;
  canDismiss?: boolean;
}

interface Emits {
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  canDismiss: false,
});

const emit = defineEmits<Emits>();

function onBackdropClick() {
  if (props.canDismiss) {
    emit('close');
  }
}
</script>
