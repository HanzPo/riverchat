<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content w-[700px] max-h-[80vh] p-8 flex flex-col">
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-2 text-white/95">
          Your Rivers
        </h2>
        <p class="text-white/75 text-sm font-medium">
          Manage your conversation sessions
        </p>
      </div>

      <!-- Create New River -->
      <div class="mb-5">
        <div class="flex gap-3">
          <input
            v-model="newRiverName"
            type="text"
            placeholder="Enter river name..."
            class="input-material flex-1"
            @keyup.enter="handleCreateRiver"
          />
          <button
            @click="handleCreateRiver"
            :disabled="!newRiverName.trim()"
            class="btn-material px-5 py-2.5 whitespace-nowrap"
          >
            + New River
          </button>
        </div>
      </div>

      <!-- Rivers List -->
      <div class="flex-1 overflow-y-auto min-h-[200px] overflow-x-visible">
        <div v-if="rivers.length === 0" class="text-center py-15 px-5 text-white/70">
          <p class="text-base mb-2 font-medium">No rivers yet</p>
          <p class="text-sm font-medium">Create your first conversation river above</p>
        </div>

        <div v-else class="flex flex-col gap-3">
          <div
            v-for="river in sortedRivers"
            :key="river.id"
            class="card-material card-material-hover p-4 cursor-pointer flex justify-between items-center overflow-visible"
            @click="handleOpenRiver(river.id)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1.5">
                <h3 class="text-base font-semibold text-white/95 overflow-hidden text-ellipsis whitespace-nowrap">
                  {{ river.name }}
                </h3>
                <span
                  v-if="river.id === activeRiverId"
                  class="px-2 py-0.5 bg-success/25 text-success rounded-md text-[10.5px] font-bold uppercase tracking-wider border border-success/40"
                >
                  Active
                </span>
              </div>
              <div class="flex gap-4 text-xs text-white/70 font-medium">
                <span>{{ formatDate(river.lastModified) }}</span>
                <span>{{ getNodeCount(river) }} nodes</span>
              </div>
            </div>

            <div class="flex gap-2" @click.stop>
              <button
                @click="handleRenameRiver(river)"
                class="btn-material px-3 py-1.5 text-[13px]"
                title="Rename"
              >
                ✏️
              </button>
              <button
                @click="handleDeleteRiver(river)"
                class="btn-material px-3 py-1.5 text-[13px]"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Close Button -->
      <div class="flex justify-end mt-5 pt-5 border-t border-white/15">
        <button @click="emit('close')" class="btn-material px-6 py-2.5">
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
