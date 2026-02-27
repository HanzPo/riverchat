<template>
  <div v-if="isOpen" class="modal-backdrop z-[200]" @click.self="onBackdropClick">
    <div class="modal-content w-[600px] p-8">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold mb-3" style="color: var(--color-text-primary); letter-spacing: -0.02em;">
          Welcome to RiverChat
        </h1>
        <p class="text-sm leading-relaxed font-medium mb-4" style="color: var(--color-text-secondary);">
          RiverChat is a non-linear chat application that visualizes conversations as branching rivers.
          Each conversation can branch into multiple paths, creating a tree-like structure of ideas.
        </p>

        <div class="rounded-lg p-4 mb-4" style="background: var(--color-success-bg); border: 1px solid var(--color-success);">
          <p class="text-sm leading-relaxed font-semibold mb-2" style="color: var(--color-text-primary);">
            Start Using RiverChat Right Away!
          </p>
          <p class="text-xs leading-relaxed" style="color: var(--color-text-secondary);">
            You get <strong>$2.00 in free credits</strong> every month to chat with budget AI models.
            No credit card required! Simply close this modal and create your first river.
            <strong>Sign up with Google anytime</strong> to save your conversations permanently.
          </p>
        </div>

        <div class="rounded-lg p-4" style="background: var(--color-info-bg); border: 1px solid var(--color-info);">
          <p class="text-sm font-semibold mb-2" style="color: var(--color-text-primary);">
            Want more? Upgrade anytime.
          </p>
          <p class="text-xs leading-relaxed" style="color: var(--color-text-secondary);">
            <strong>Pro ($20/mo)</strong> unlocks standard and premium models like GPT-5.2 and Claude Sonnet 4.6.
            <strong>Max ($100/mo)</strong> gives you access to every model including frontier models like Claude Opus 4.6 and GPT-5.2 Pro.
            You can upgrade from the Settings page at any time.
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          @click="emit('close')"
          class="btn-material"
          style="padding: 10px 24px; font-weight: 600; font-size: 14px; background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);"
        >
          Get Started
        </button>
      </div>
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
