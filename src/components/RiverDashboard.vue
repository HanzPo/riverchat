<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content" style="width: 700px; max-height: 80vh; padding: 32px; display: flex; flex-direction: column;">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">
          Your Rivers
        </h2>
        <p style="color: var(--text-secondary); font-size: 14px;">
          Manage your conversation sessions
        </p>
      </div>

      <!-- Create New River -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; gap: 12px;">
          <input
            v-model="newRiverName"
            type="text"
            placeholder="Enter river name..."
            class="glass-input"
            @keyup.enter="handleCreateRiver"
            style="flex: 1;"
          />
          <button
            @click="handleCreateRiver"
            :disabled="!newRiverName.trim()"
            class="glass-button"
            style="padding: 10px 20px; white-space: nowrap;"
          >
            + New River
          </button>
        </div>
      </div>

      <!-- Rivers List -->
      <div style="flex: 1; overflow-y: auto; min-height: 200px;">
        <div v-if="rivers.length === 0" style="
          text-align: center;
          padding: 60px 20px;
          color: var(--text-secondary);
        ">
          <p style="font-size: 16px; margin-bottom: 8px;">No rivers yet</p>
          <p style="font-size: 14px;">Create your first conversation river above</p>
        </div>

        <div v-else style="display: flex; flex-direction: column; gap: 12px;">
          <div
            v-for="river in sortedRivers"
            :key="river.id"
            class="glass glass-hover"
            style="
              padding: 16px;
              cursor: pointer;
              display: flex;
              justify-content: space-between;
              align-items: center;
            "
            @click="handleOpenRiver(river.id)"
          >
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <h3 style="
                  font-size: 16px;
                  font-weight: 600;
                  color: var(--text-primary);
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                ">
                  {{ river.name }}
                </h3>
                <span
                  v-if="river.id === activeRiverId"
                  style="
                    padding: 2px 8px;
                    background: rgba(16, 185, 129, 0.2);
                    color: var(--success-color);
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                  "
                >
                  Active
                </span>
              </div>
              <div style="display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary);">
                <span>{{ formatDate(river.lastModified) }}</span>
                <span>{{ getNodeCount(river) }} nodes</span>
              </div>
            </div>

            <div style="display: flex; gap: 8px;" @click.stop>
              <button
                @click="handleRenameRiver(river)"
                class="glass-button"
                style="padding: 6px 12px; font-size: 13px;"
                title="Rename"
              >
                ✏️
              </button>
              <button
                @click="handleDeleteRiver(river)"
                class="glass-button"
                style="padding: 6px 12px; font-size: 13px;"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Close Button -->
      <div style="display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--glass-border);">
        <button @click="emit('close')" class="glass-button">
          Close
        </button>
      </div>
    </div>
  </div>

  <!-- Confirmation Modal for Delete -->
  <ConfirmationModal
    :is-open="deleteConfirmation.isOpen"
    title="Delete River?"
    :message="`Are you sure you want to delete &quot;${deleteConfirmation.riverName}&quot;? This action cannot be undone.`"
    confirm-text="Delete"
    cancel-text="Cancel"
    :is-dangerous="true"
    @confirm="confirmDelete"
    @close="deleteConfirmation.isOpen = false"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { River } from '../types';
import ConfirmationModal from './ConfirmationModal.vue';

interface Props {
  isOpen: boolean;
  rivers: River[];
  activeRiverId: string | null;
}

interface Emits {
  (e: 'create', name: string): void;
  (e: 'open', riverId: string): void;
  (e: 'rename', riverId: string, newName: string): void;
  (e: 'delete', riverId: string): void;
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const newRiverName = ref('');
const deleteConfirmation = ref({
  isOpen: false,
  riverId: '',
  riverName: '',
});

const sortedRivers = computed(() => {
  return [...props.rivers].sort((a, b) => {
    return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
  });
});

function handleCreateRiver() {
  if (newRiverName.value.trim()) {
    emit('create', newRiverName.value.trim());
    newRiverName.value = '';
  }
}

function handleOpenRiver(riverId: string) {
  emit('open', riverId);
  emit('close');
}

function handleRenameRiver(river: River) {
  const newName = prompt('Enter new name:', river.name);
  if (newName && newName.trim() && newName !== river.name) {
    emit('rename', river.id, newName.trim());
  }
}

function handleDeleteRiver(river: River) {
  deleteConfirmation.value = {
    isOpen: true,
    riverId: river.id,
    riverName: river.name,
  };
}

function confirmDelete() {
  if (deleteConfirmation.value.riverId) {
    emit('delete', deleteConfirmation.value.riverId);
  }
  deleteConfirmation.value = {
    isOpen: false,
    riverId: '',
    riverName: '',
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

function getNodeCount(river: River): number {
  return Object.keys(river.nodes).length;
}
</script>

