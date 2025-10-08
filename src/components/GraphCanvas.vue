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
      @node-drag-start="handleNodeDragStart"
      @node-drag="handleNodeDrag"
      @node-drag-stop="handleNodeDragStop"
      @pane-click="handlePaneClick"
      @pane-context-menu="handlePaneContextMenu"
    >
      <Background variant="dots" pattern-color="#808080" :gap="30" />
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
      <!-- Pane Context Menu (when no node is selected) -->
      <template v-if="!contextMenu.node && contextMenu.selectedNodes.length === 0">
        <div class="context-menu-item" @click="handleCreateRootNode">
          ➕ New Root Node
        </div>
      </template>

      <!-- Multiple Nodes Selected -->
      <template v-else-if="contextMenu.selectedNodes.length > 1">
        <div class="context-menu-item context-menu-item-header">
          {{ contextMenu.selectedNodes.length }} Nodes Selected
        </div>
        
        <div class="context-menu-item context-menu-item-danger" @click="handleDeleteMultipleNodes">
          🗑️ Delete Selected Nodes
        </div>
      </template>

      <!-- Single Node Context Menu -->
      <template v-else>
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

        <div class="context-menu-item context-menu-item-danger" @click="handleDeleteBranch">
          🗑️ Delete Branch
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
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
  (e: 'delete-branches-batch', nodeIds: string[]): void;
  (e: 'copy-message', content: string): void;
  (e: 'update-position', nodeId: string, position: { x: number; y: number }): void;
  (e: 'update-positions-batch', updates: Array<{ nodeId: string; position: { x: number; y: number } }>): void;
  (e: 'create-root-node'): void;
  (e: 'pane-click'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { getSelectedNodes } = useVueFlow();

// Track nodes being dragged to batch position updates
const draggedNodes = ref<Set<string>>(new Set());
const isDragging = ref(false);

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null as MessageNode | null,
  selectedNodes: [] as MessageNode[],
});

// Use a ref instead of computed to avoid interfering with VueFlow's drag handling
const flowNodes = ref<VueFlowNode[]>([]);

// Function to sync flow nodes from props
function syncFlowNodes() {
  // Don't sync during drag to avoid interfering with VueFlow's position management
  if (isDragging.value) return;
  
  const nodeMap = props.nodes;
  
  // Calculate positions - use stored positions when available, otherwise calculate
  const positions = calculatePositions(nodeMap, props.rootNodeId);

  // Build a map of current flow nodes for easy lookup
  const currentFlowNodesMap = new Map(flowNodes.value.map(n => [n.id, n]));
  
  const result: VueFlowNode[] = [];

  Object.values(nodeMap).forEach((node) => {
    const pos = node.position || positions[node.id] || { x: 0, y: 0 };
    
    // Check if this node already exists in flowNodes
    const existingNode = currentFlowNodesMap.get(node.id);
    
    if (existingNode) {
      // Update existing node in-place to preserve VueFlow's internal references
      existingNode.position = pos;
      existingNode.data = node;
      result.push(existingNode);
    } else {
      // New node - create it
      result.push({
        id: node.id,
        type: 'custom',
        position: pos,
        data: node,
      });
    }
  });

  flowNodes.value = result;
}

// Watch for changes in props.nodes and sync (but not during drag)
watch(() => props.nodes, syncFlowNodes, { deep: true, immediate: true });

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
          stroke: node.state === 'generating' ? '#4a9eff' : 'rgba(255, 255, 255, 0.2)',
          strokeWidth: '2.5',
          strokeDasharray: node.state === 'generating' ? '5, 5' : '0',
        },
      });
    }
  });

  return result;
});

// Enhanced layout algorithm that handles multiple root nodes
function calculatePositions(
  nodes: Record<string, MessageNode>,
  _rootId: string | null
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  
  const ROOT_SPACING = 500; // Space between different root trees

  // Find all root nodes (nodes without parents)
  const rootNodes = Object.values(nodes).filter((n) => !n.parentId);
  
  if (rootNodes.length === 0) return positions;

  // Layout each root tree
  let currentRootX = 0;
  
  rootNodes.forEach((rootNode) => {
    const treePositions = layoutTree(rootNode.id, nodes, currentRootX);
    Object.assign(positions, treePositions);
    
    // Find the max X position used by this tree
    const maxX = Math.max(...Object.values(treePositions).map(p => p.x));
    currentRootX = maxX + ROOT_SPACING;
  });

  return positions;
}

function layoutTree(
  rootId: string,
  nodes: Record<string, MessageNode>,
  startX: number
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
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
      x: startX + (horizontalIndex * HORIZONTAL_SPACING),
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

// Auto-fit view disabled to avoid distracting zoom behavior
// Users can manually zoom using the controls

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
    // Check if multiple nodes are selected
    const selectedNodes = getSelectedNodes.value || [];
    const selectedNodesData = selectedNodes.map(n => n.data as MessageNode);
    
    contextMenu.value = {
      visible: true,
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      node,
      selectedNodes: selectedNodesData.length > 1 ? selectedNodesData : [],
    };
  }
}

function handlePaneClick() {
  emit('node-select', null);
  emit('pane-click');
  closeContextMenu();
}

function handlePaneContextMenu(event: any) {
  const mouseEvent = event.event || event;
  
  if (mouseEvent) {
    contextMenu.value = {
      visible: true,
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      node: null, // No node selected for pane context menu
      selectedNodes: [],
    };
  }
}

function handleNodeDragStart() {
  // Mark that dragging has started - this prevents syncFlowNodes from running
  isDragging.value = true;
  draggedNodes.value.clear();
}

function handleNodeDrag() {
  // During drag, VueFlow handles positions internally
  // We don't need to do anything here
}

async function handleNodeDragStop(event: any) {
  const nodeId = event.node?.id;
  const position = event.node?.position;
  
  if (!nodeId || !position) return;

  // Get all currently selected nodes from VueFlow
  const selectedNodes = getSelectedNodes.value || [];
  
  // If multiple nodes are selected, batch update all of them
  if (selectedNodes.length > 1) {
    // Add this node to the dragged nodes set
    draggedNodes.value.add(nodeId);
    
    // Check if we've received drag-stop events for all selected nodes
    const allSelectedIds = selectedNodes.map(n => n.id);
    const allDragged = allSelectedIds.every(id => draggedNodes.value.has(id));
    
    if (allDragged) {
      // All selected nodes have finished dragging, collect all positions from VueFlow
      const updates = selectedNodes
        .filter(node => node.position)
        .map(node => ({
          nodeId: node.id,
          position: { x: node.position!.x, y: node.position!.y }
        }));
      
      // Emit a single batch update event
      emit('update-positions-batch', updates);
      
      // Clear the dragged nodes set
      draggedNodes.value.clear();
      
      // Wait for Vue to process the update before allowing sync
      await nextTick();
      await nextTick(); // Double nextTick to ensure props have propagated
      isDragging.value = false;
    }
  } else {
    // Single node drag - update immediately
    emit('update-position', nodeId, { x: position.x, y: position.y });
    
    // Wait for Vue to process the update before allowing sync
    await nextTick();
    await nextTick(); // Double nextTick to ensure props have propagated
    isDragging.value = false;
  }
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

function handleDeleteMultipleNodes() {
  if (contextMenu.value.selectedNodes.length > 0) {
    // Collect all node IDs and emit as a batch
    const nodeIds = contextMenu.value.selectedNodes.map(node => node.id);
    emit('delete-branches-batch', nodeIds);
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

function handleCreateRootNode() {
  emit('create-root-node');
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
  background: #000000;
}

:deep(.vue-flow__background) {
  background-color: #000000;
}

:deep(.vue-flow__minimap) {
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

:deep(.vue-flow__minimap-node) {
  fill: rgba(74, 158, 255, 0.4);
  stroke: rgba(74, 158, 255, 0.6);
  stroke-width: 2;
}

:deep(.vue-flow__controls) {
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12);
}

:deep(.vue-flow__controls-button) {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
}

:deep(.vue-flow__controls-button svg) {
  fill: rgba(255, 255, 255, 0.9);
  max-width: 16px;
  max-height: 16px;
}

:deep(.vue-flow__controls-button:hover) {
  background: rgba(74, 158, 255, 0.15);
  color: rgba(255, 255, 255, 1);
}

:deep(.vue-flow__controls-button:hover svg) {
  fill: rgba(255, 255, 255, 1);
}

:deep(.vue-flow__controls-button:last-child) {
  border-bottom: none;
}
</style>

