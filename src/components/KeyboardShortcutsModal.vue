<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">⌨️ Keyboard Shortcuts</h2>
        <button @click="$emit('close')" class="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="shortcuts-grid">
          <!-- General -->
          <div class="shortcuts-section">
            <h3 class="section-title">General</h3>
            <div class="shortcuts-list">
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>?</kbd>
                </div>
                <div class="shortcut-description">Show this help dialog</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>,</kbd>
                </div>
                <div class="shortcut-description">Open settings</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>K</kbd>
                </div>
                <div class="shortcut-description">Open rivers dashboard</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>F</kbd>
                </div>
                <div class="shortcut-description">Search</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>Esc</kbd>
                </div>
                <div class="shortcut-description">Close modal/panel</div>
              </div>
            </div>
          </div>

          <!-- Rivers & Navigation -->
          <div class="shortcuts-section">
            <h3 class="section-title">Rivers & Navigation</h3>
            <div class="shortcuts-list">
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>N</kbd>
                </div>
                <div class="shortcut-description">Create new river</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>R</kbd>
                </div>
                <div class="shortcut-description">Create new root node</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>Enter</kbd>
                </div>
                <div class="shortcut-description">Send message</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>D</kbd>
                </div>
                <div class="shortcut-description">Deselect node</div>
              </div>
            </div>
          </div>

          <!-- Node Actions -->
          <div class="shortcuts-section">
            <h3 class="section-title">Node Actions</h3>
            <div class="shortcuts-list">
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>B</kbd>
                </div>
                <div class="shortcut-description">Branch from selected node</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>G</kbd>
                </div>
                <div class="shortcut-description">Regenerate AI response</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>E</kbd>
                </div>
                <div class="shortcut-description">Edit & resubmit message</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>C</kbd>
                </div>
                <div class="shortcut-description">Copy selected message</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>Delete</kbd>
                </div>
                <div class="shortcut-description">Delete selected node/branch</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>V</kbd>
                </div>
                <div class="shortcut-description">View full message</div>
              </div>
            </div>
          </div>

          <!-- Graph Controls -->
          <div class="shortcuts-section">
            <h3 class="section-title">Graph Controls</h3>
            <div class="shortcuts-list">
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>+</kbd>
                </div>
                <div class="shortcut-description">Zoom in</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>-</kbd>
                </div>
                <div class="shortcut-description">Zoom out</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>0</kbd>
                </div>
                <div class="shortcut-description">Reset zoom</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>A</kbd>
                </div>
                <div class="shortcut-description">Select all nodes</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>Space</kbd>
                  <span>+</span>
                  <kbd>Drag</kbd>
                </div>
                <div class="shortcut-description">Pan canvas</div>
              </div>
            </div>
          </div>

          <!-- Panel Controls -->
          <div class="shortcuts-section">
            <h3 class="section-title">Panel Controls</h3>
            <div class="shortcuts-list">
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>[</kbd>
                </div>
                <div class="shortcut-description">Focus chat input</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>]</kbd>
                </div>
                <div class="shortcut-description">Toggle chat panel</div>
              </div>
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  <kbd>{{ ctrlKey }}</kbd>
                  <span>+</span>
                  <kbd>M</kbd>
                </div>
                <div class="shortcut-description">Toggle minimap</div>
              </div>
            </div>
          </div>

          <!-- Tips -->
          <div class="shortcuts-section shortcuts-section-full">
            <h3 class="section-title">💡 Tips</h3>
            <div class="tips-list">
              <div class="tip-item">
                <strong>Multi-select:</strong> Hold <kbd>{{ ctrlKey }}</kbd> and click nodes to select multiple, then use context menu to delete all at once.
              </div>
              <div class="tip-item">
                <strong>Quick branch:</strong> Right-click any node to see available actions in the context menu.
              </div>
              <div class="tip-item">
                <strong>Text branching:</strong> Select text in any message to create a new branch exploring that specific part.
              </div>
              <div class="tip-item">
                <strong>Resize panel:</strong> Drag the left edge of the chat panel to resize it to your preference.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  isOpen: boolean;
}

defineProps<Props>();
defineEmits<{
  (e: 'close'): void;
}>();

// Detect OS for correct modifier key display
const ctrlKey = computed(() => {
  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac');
  return isMac ? '⌘' : 'Ctrl';
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-container {
  background: rgba(20, 20, 20, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  max-width: 1100px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 24px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 28px;
}

.shortcuts-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
}

.shortcuts-section-full {
  grid-column: 1 / -1;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: rgba(74, 158, 255, 0.95);
  margin: 0 0 16px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(74, 158, 255, 0.2);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 10px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.shortcut-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.shortcut-keys span {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

kbd {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 4px 10px;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  min-width: 28px;
  text-align: center;
  display: inline-block;
}

.shortcut-description {
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  flex: 1;
  text-align: right;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tip-item {
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  line-height: 1.6;
  padding: 12px;
  background: rgba(74, 158, 255, 0.08);
  border-left: 3px solid rgba(74, 158, 255, 0.5);
  border-radius: 6px;
}

.tip-item strong {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

.tip-item kbd {
  font-size: 12px;
  padding: 2px 6px;
  margin: 0 2px;
}

/* Scrollbar styling */
.modal-body::-webkit-scrollbar {
  width: 10px;
}

.modal-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .modal-container {
    width: 95%;
    max-height: 90vh;
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
  }

  .shortcut-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .shortcut-description {
    text-align: left;
  }
}
</style>
