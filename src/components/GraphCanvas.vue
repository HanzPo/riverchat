<template>
  <div class="graph-canvas">
    <VueFlow
      v-model:nodes="flowNodes"
      v-model:edges="flowEdges"
      :default-zoom="1"
      :min-zoom="0.2"
      :max-zoom="2"
      :fit-view-on-init="true"
      @node-click="handleNodeClick"
      @node-double-click="handleNodeDoubleClick"
      @node-context-menu="handleNodeContextMenu"
      @pane-click="handlePaneClick"
    >
      <Background pattern-color="#aaa" :gap="16" />
      <Controls />
      <MiniMap />

      <template #node-custom="nodeProps">
        <CustomNode
          :data="nodeProps.data"
          :selected="nodeProps.selected"
          @click="handleNodeClick"
          @double-click="handleNodeDoubleClick"
          @context-menu="handleNodeContextMenu"
        />
      </template>
    </VueFlow>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{
        left: `${contextMenu.x}px`,
        top: `${contextMenu.y}px`,
      }"
      @click="closeContextMenu"
    >
      <div
        v-if="contextMenu.node?.type === 'user'"
        class="context-menu-item"
        @click="handleEditAndResubmit"
      >
        ✏️ Edit & Resubmit
      </div>
      
      <div class="context-menu-item" @click="handleBranchFromHere">
        🌿 Branch From Here
      </div>

      <div
        v-if="contextMenu.node?.type === 'ai'"
        class="context-menu-item"
        @click="handleRegenerateResponse"
      >
        🔄 Regenerate Response
      </div>

      <div class="context-menu-item" @click="handleCopyMessage">
        📋 Copy Message
      </div>

      <div class="context-menu-item" @click="handleViewFull">
        👁️ View Full Message
      </div>

      <div class="context-menu-item danger" @click="handleDeleteBranch">
        🗑️ Delete Branch
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import type { MessageNode, VueFlowNode, VueFlowEdge } from '../types';
import CustomNode from './CustomNode.vue';

// Import Vue Flow styles
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

interface Props {
  nodes: Record<string, MessageNode>;
  rootNodeId: string | null;
  selectedNodeId: string | null;
}

interface Emits {
  (e: 'node-select', nodeId: string | null): void;
  (e: 'node-double-click', node: MessageNode): void;
  (e: 'branch-from', nodeId: string): void;
  (e: 'regenerate', nodeId: string): void;
  (e: 'edit-resubmit', nodeId: string): void;
  (e: 'delete-branch', nodeId: string): void;
  (e: 'copy-message', content: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { fitView } = useVueFlow();

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null as MessageNode | null,
});

// Convert nodes to Vue Flow format
const flowNodes = computed<VueFlowNode[]>(() => {
  const result: VueFlowNode[] = [];
  const nodeMap = props.nodes;
  
  // Calculate positions using a simple tree layout
  const positions = calculateTreeLayout(nodeMap, props.rootNodeId);

  Object.values(nodeMap).forEach((node) => {
    const pos = positions[node.id] || { x: 0, y: 0 };
    
    result.push({
      id: node.id,
      type: 'custom',
      position: pos,
      data: node,
    });
  });

  return result;
});

// Convert edges
const flowEdges = computed<VueFlowEdge[]>(() => {
  const result: VueFlowEdge[] = [];
  
  Object.values(props.nodes).forEach((node) => {
    if (node.parentId) {
      result.push({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        animated: node.state === 'generating',
        style: {
          stroke: node.state === 'generating' ? 'rgba(102, 126, 234, 0.6)' : 'var(--glass-border)',
          strokeWidth: '2',
          strokeDasharray: node.state === 'generating' ? '5, 5' : '0',
        },
      });
    }
  });

  return result;
});

// Simple tree layout algorithm
function calculateTreeLayout(
  nodes: Record<string, MessageNode>,
  rootId: string | null
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  
  if (!rootId) return positions;

  const HORIZONTAL_SPACING = 350;
  const VERTICAL_SPACING = 200;

  function layoutNode(
    nodeId: string,
    depth: number,
    horizontalIndex: number
  ): number {
    const node = nodes[nodeId];
    if (!node) return horizontalIndex;

    positions[nodeId] = {
      x: horizontalIndex * HORIZONTAL_SPACING,
      y: depth * VERTICAL_SPACING,
    };

    // Find children
    const children = Object.values(nodes).filter((n) => n.parentId === nodeId);
    
    let currentIndex = horizontalIndex;
    children.forEach((child, index) => {
      if (index > 0) currentIndex++;
      currentIndex = layoutNode(child.id, depth + 1, currentIndex);
    });

    return currentIndex;
  }

  layoutNode(rootId, 0, 0);
  return positions;
}

// Watch for changes and fit view
watch([flowNodes, flowEdges], () => {
  setTimeout(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, 100);
});

// Event handlers
function handleNodeClick(event: any) {
  const nodeId = event.node?.id || event.data?.id;
  if (nodeId) {
    emit('node-select', nodeId);
  }
}

function handleNodeDoubleClick(event: any) {
  const node = event.node?.data || event.data;
  if (node) {
    emit('node-double-click', node);
  }
}

function handleNodeContextMenu(event: any) {
  const mouseEvent = event.event || event;
  const node = event.node?.data || event.data;
  
  if (node && mouseEvent) {
    contextMenu.value = {
      visible: true,
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      node,
    };
  }
}

function handlePaneClick() {
  emit('node-select', null);
  closeContextMenu();
}

function closeContextMenu() {
  contextMenu.value.visible = false;
}

// Context menu actions
function handleBranchFromHere() {
  if (contextMenu.value.node) {
    emit('branch-from', contextMenu.value.node.id);
  }
}

function handleRegenerateResponse() {
  if (contextMenu.value.node?.parentId) {
    emit('regenerate', contextMenu.value.node.parentId);
  }
}

function handleEditAndResubmit() {
  if (contextMenu.value.node) {
    emit('edit-resubmit', contextMenu.value.node.id);
  }
}

function handleDeleteBranch() {
  if (contextMenu.value.node) {
    emit('delete-branch', contextMenu.value.node.id);
  }
}

function handleCopyMessage() {
  if (contextMenu.value.node) {
    emit('copy-message', contextMenu.value.node.content);
  }
}

function handleViewFull() {
  if (contextMenu.value.node) {
    emit('node-double-click', contextMenu.value.node);
  }
}

// Close context menu on click outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.context-menu')) {
    closeContextMenu();
  }
}

// Add click listener
if (typeof window !== 'undefined') {
  window.addEventListener('click', handleClickOutside);
}
</script>

<style scoped>
.graph-canvas {
  width: 100%;
  height: 100%;
  position: relative;
  background: var(--bg-secondary);
}

:deep(.vue-flow__background) {
  background-color: var(--bg-secondary);
}

:deep(.vue-flow__minimap) {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
}

:deep(.vue-flow__controls) {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  box-shadow: var(--glass-shadow);
}

:deep(.vue-flow__controls-button) {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-primary);
  transition: all 0.2s ease;
}

:deep(.vue-flow__controls-button:hover) {
  background: var(--glass-bg-hover);
}

:deep(.vue-flow__controls-button:last-child) {
  border-bottom: none;
}
</style>

