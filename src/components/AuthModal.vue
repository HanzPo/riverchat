<template>
  <div v-if="isOpen" class="modal-backdrop z-[200]" @click.self="emit('close')">
    <div class="modal-content w-[500px] p-8">
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-2" style="color: var(--color-text-primary); letter-spacing: -0.01em;">
          {{ isAnonymous ? 'Save Your Conversations' : 'Welcome to RiverChat' }}
        </h2>
        <p class="text-sm font-medium" style="color: var(--color-text-secondary);">
          {{ isAnonymous
            ? 'Connect your Google account to save your conversations and credits permanently'
            : 'Sign in with Google to sync your data across devices' }}
        </p>
      </div>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="mb-4 rounded-lg p-3"
        style="background: var(--color-error-bg); border: 1px solid var(--color-error);"
      >
        <p class="text-xs font-medium" style="color: var(--color-error);">
          {{ errorMessage }}
        </p>
      </div>

      <!-- Info Box -->
      <div
        class="mb-4 rounded-lg p-3"
        style="background: var(--color-info-bg); border: 1px solid var(--color-info);"
      >
        <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
          {{ isAnonymous
            ? 'Linking your Google account will preserve all your existing conversations and remaining credits.'
            : 'Sign in to sync your conversations and credits across devices.' }}
        </p>
      </div>

      <!-- Account Conflict Warning -->
      <div
        v-if="showAccountConflict"
        class="mb-4 rounded-lg p-3"
        style="background: var(--color-warning-bg, #fff8e1); border: 1px solid var(--color-warning, #f9a825);"
      >
        <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
          This Google account is already registered. Signing in will switch to that account and your current conversations and credits will not be carried over.
        </p>
      </div>

      <!-- Google OAuth Button -->
      <button
        v-if="!showAccountConflict"
        type="button"
        @click="handleGoogleSignIn()"
        class="btn-material w-full mb-4 flex items-center justify-center gap-3"
        :disabled="isLoading"
        style="padding: 10px 16px; font-weight: 600; background: white; color: #1f1f1f; border: 1px solid #e0e0e0;"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
          <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
        </svg>
        {{ isLoading ? 'Signing in...' : (isAnonymous ? 'Sign up with Google' : 'Sign in with Google') }}
      </button>

      <!-- Account conflict actions -->
      <template v-if="showAccountConflict">
        <button
          type="button"
          @click="handleGoogleSignIn(true)"
          class="btn-material w-full mb-2"
          :disabled="isLoading"
          style="padding: 10px 16px; font-weight: 600;"
        >
          {{ isLoading ? 'Signing in...' : 'Sign in anyway' }}
        </button>
        <button
          type="button"
          @click="showAccountConflict = false"
          class="btn-material w-full mb-4"
          :disabled="isLoading"
          style="padding: 10px 16px;"
        >
          Cancel
        </button>
      </template>

      <!-- Cancel button -->
      <button
        v-if="!showAccountConflict"
        type="button"
        @click="emit('close')"
        class="btn-material w-full"
        :disabled="isLoading"
        style="padding: 10px 16px;"
      >
        {{ isAnonymous ? 'Maybe Later' : 'Cancel' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { AuthService } from '../services/auth';
import { FirestoreStorageService } from '../services/firestore-storage';
import { auth } from '../config/firebase';

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'authenticated'): void;
}

const props = defineProps<Props>();

const emit = defineEmits<Emits>();

const errorMessage = ref('');
const isLoading = ref(false);
const showAccountConflict = ref(false);
const isAnonymous = computed(() => auth.currentUser?.isAnonymous ?? false);

// Reset form when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      errorMessage.value = '';
      showAccountConflict.value = false;
    }
  }
);

async function handleGoogleSignIn(forceSignIn: boolean = false) {
  if (isLoading.value) return;

  errorMessage.value = '';
  showAccountConflict.value = false;
  isLoading.value = true;

  try {
    await AuthService.signInWithGoogle(forceSignIn);

    // Migrate local data to Firestore after Google sign-in (skip for force sign-in,
    // since the user was told their anonymous data would not carry over)
    if (!forceSignIn) {
      try {
        await FirestoreStorageService.migrateLocalDataToFirestore();
      } catch (migrationError) {
        console.error('Migration error:', migrationError);
        // Don't block sign-in if migration fails
      }
    }

    // Success! Close modal and notify parent
    emit('authenticated');
    emit('close');
  } catch (error: any) {
    if (error.code === 'auth/credential-already-in-use') {
      showAccountConflict.value = true;
    } else {
      const message = error instanceof Error ? error.message : 'An error occurred';

      // Don't show error if user just closed the popup
      if (message.includes('cancelled') || message.includes('closed the popup')) {
        errorMessage.value = '';
      } else {
        errorMessage.value = message;
      }
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
/* No additional styles needed - using global modal classes */
</style>
