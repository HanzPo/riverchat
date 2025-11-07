<template>
  <div class="graph-canvas" ref="canvasContainer">
    <VueFlow
      v-model:nodes="flowNodes"
      v-model:edges="flowEdges"
      :default-zoom="1"
      :min-zoom="0.2"
      :max-zoom="2"
      :fit-view-on-init="true"
      :delete-key-code="null"
      @node-click="handleNodeClick"
      @node-double-click="handleNodeDoubleClick"
      @node-context-menu="handleNodeContextMenu"
      @node-drag-start="handleNodeDragStart"
      @node-drag="handleNodeDrag"
      @node-drag-stop="handleNodeDragStop"
      @pane-click="handlePaneClick"
      @pane-context-menu="handlePaneContextMenu"
    >
      <Background variant="dots" pattern-color="#404040" :gap="30" />
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

    <!-- Selection Rectangle -->
    <div
      v-if="selectionBox.active"
      class="selection-rectangle"
      :style="{
        left: `${selectionBox.x}px`,
        top: `${selectionBox.y}px`,
        width: `${selectionBox.width}px`,
        height: `${selectionBox.height}px`,
      }"
    ></div>

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
          <Plus :size="16" />
          <span>New Root Node</span>
        </div>
      </template>

      <!-- Multiple Nodes Selected -->
      <template v-else-if="contextMenu.selectedNodes.length > 1">
        <div class="context-menu-item context-menu-item-header">
          {{ contextMenu.selectedNodes.length }} Nodes Selected
        </div>

        <div class="context-menu-item context-menu-item-danger" @click="handleDeleteMultipleNodes">
          <Trash2 :size="16" />
          <span>Delete Selected Nodes</span>
        </div>
      </template>

      <!-- Single Node Context Menu -->
      <template v-else>
        <div
          v-if="contextMenu.node?.type === 'user'"
          class="context-menu-item"
          @click="handleEditAndResubmit"
        >
          <Pencil :size="16" />
          <span>Edit & Resubmit</span>
        </div>

        <div class="context-menu-item" @click="handleBranchFromHere">
          <GitBranch :size="16" />
          <span>Branch From Here</span>
        </div>

        <div
          v-if="contextMenu.node?.type === 'ai'"
          class="context-menu-item"
          @click="handleRegenerateResponse"
        >
          <RotateCw :size="16" />
          <span>Regenerate Response</span>
        </div>

        <div class="context-menu-item" @click="handleCopyMessage">
          <Copy :size="16" />
          <span>Copy Message</span>
        </div>

        <div class="context-menu-item" @click="handleViewFull">
          <Eye :size="16" />
          <span>View Full Message</span>
        </div>

        <div class="context-menu-item context-menu-item-danger" @click="handleDeleteBranch">
          <Trash2 :size="16" />
          <span>Delete Branch</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import type { MessageNode, VueFlowNode, VueFlowEdge } from '../types';
import { Plus, Trash2, Pencil, GitBranch, RotateCw, Copy, Eye } from 'lucide-vue-next';
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
  (e: 'selection-change', hasMultipleSelected: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { getSelectedNodes, project, vueFlowRef } = useVueFlow();

// Track nodes being dragged to batch position updates
const draggedNodes = ref<Set<string>>(new Set());
const isDragging = ref(false);

// Selection box state
const canvasContainer = ref<HTMLElement | null>(null);
const selectionBox = ref({
  active: false,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});
const isRightDragging = ref(false);

// Watch for selection changes and emit to parent
watch(
  () => getSelectedNodes.value,
  (selectedNodes) => {
    const hasMultipleSelected = (selectedNodes?.length || 0) > 1;
    emit('selection-change', hasMultipleSelected);
  },
  { deep: true }
);

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

// Selection box handlers
function startSelectionBox(event: MouseEvent) {
  // Only start selection on right-click
  if (event.button !== 2) return;
  
  const rect = canvasContainer.value?.getBoundingClientRect();
  if (!rect) return;
  
  isRightDragging.value = false;
  
  selectionBox.value = {
    active: true,
    startX: event.clientX - rect.left,
    startY: event.clientY - rect.top,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: 0,
    height: 0,
  };
  
  // Add event listeners
  document.addEventListener('mousemove', updateSelectionBox);
  document.addEventListener('mouseup', endSelectionBox);
  document.addEventListener('contextmenu', preventContextMenu);
}

function preventContextMenu(event: Event) {
  if (isRightDragging.value) {
    event.preventDefault();
    event.stopPropagation();
  }
  document.removeEventListener('contextmenu', preventContextMenu);
}

function updateSelectionBox(event: MouseEvent) {
  if (!selectionBox.value.active) return;
  
  const rect = canvasContainer.value?.getBoundingClientRect();
  if (!rect) return;
  
  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;
  
  const minX = Math.min(selectionBox.value.startX, currentX);
  const minY = Math.min(selectionBox.value.startY, currentY);
  const maxX = Math.max(selectionBox.value.startX, currentX);
  const maxY = Math.max(selectionBox.value.startY, currentY);
  
  selectionBox.value.x = minX;
  selectionBox.value.y = minY;
  selectionBox.value.width = maxX - minX;
  selectionBox.value.height = maxY - minY;
  
  // If we've dragged more than 5 pixels, consider it a drag
  const dragDistance = Math.sqrt(
    Math.pow(currentX - selectionBox.value.startX, 2) + 
    Math.pow(currentY - selectionBox.value.startY, 2)
  );
  
  if (dragDistance > 5) {
    isRightDragging.value = true;
  }
}

function endSelectionBox(event: MouseEvent) {
  if (!selectionBox.value.active) return;
  
  const wasDragging = isRightDragging.value;
  
  // Only select nodes if we actually dragged
  if (wasDragging) {
    // Prevent context menu from showing
    event.preventDefault();
    event.stopPropagation();
    
    // Select nodes within the selection box
    selectNodesInBox();
    
    // Set a flag to prevent context menu from showing
    // We'll clear this flag after a short delay
    setTimeout(() => {
      isRightDragging.value = false;
    }, 100);
  } else {
    isRightDragging.value = false;
  }
  
  // Reset selection box
  selectionBox.value.active = false;
  
  // Remove event listeners
  document.removeEventListener('mousemove', updateSelectionBox);
  document.removeEventListener('mouseup', endSelectionBox);
  document.removeEventListener('contextmenu', preventContextMenu);
}

function selectNodesInBox() {
  if (!selectionBox.value.active || !vueFlowRef.value) return;
  
  const rect = canvasContainer.value?.getBoundingClientRect();
  if (!rect) return;
  
  // Convert selection box coordinates from screen space to flow space
  const boxMinScreen = {
    x: selectionBox.value.x,
    y: selectionBox.value.y,
  };
  const boxMaxScreen = {
    x: selectionBox.value.x + selectionBox.value.width,
    y: selectionBox.value.y + selectionBox.value.height,
  };
  
  // Project screen coordinates to flow coordinates
  const boxMin = project(boxMinScreen);
  const boxMax = project(boxMaxScreen);
  
  // Find node IDs within the selection box
  const nodeIdsToSelect: string[] = [];
  
  flowNodes.value.forEach((node) => {
    const nodeLeft = node.position.x;
    const nodeTop = node.position.y;
    // Approximate node dimensions (actual node size may vary)
    const nodeWidth = 300;
    const nodeHeight = 100;
    const nodeRight = nodeLeft + nodeWidth;
    const nodeBottom = nodeTop + nodeHeight;
    
    // Check if node intersects with selection box
    const intersects =
      nodeLeft < boxMax.x &&
      nodeRight > boxMin.x &&
      nodeTop < boxMax.y &&
      nodeBottom > boxMin.y;
    
    if (intersects) {
      nodeIdsToSelect.push(node.id);
    }
  });
  
  // Update selection by setting the selected property on nodes
  flowNodes.value.forEach((node) => {
    // Use type assertion to modify the node
    const internalNode = node as any;
    internalNode.selected = nodeIdsToSelect.includes(node.id);
  });
}

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
  emit('selection-change', false);
  closeContextMenu();
}

function handlePaneContextMenu(event: any) {
  // Don't show context menu if we just completed a drag selection
  if (isRightDragging.value) {
    return;
  }
  
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

function handleKeyboardDelete(event: KeyboardEvent) {
  // Handle Delete or Backspace key
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Check if user is typing in an input field
    const target = event.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    if (isTyping) {
      // Don't interfere with typing
      return;
    }
    
    // Get currently selected nodes
    const selectedNodes = getSelectedNodes.value || [];
    
    if (selectedNodes.length > 0) {
      // Prevent default browser behavior
      event.preventDefault();
      
      // Extract node IDs from selected nodes
      const nodeIds = selectedNodes.map(node => node.id);
      
      // Emit the batch delete event to trigger the proper deletion flow
      // This will show the confirmation dialog and properly delete nodes with descendants
      emit('delete-branches-batch', nodeIds);
    }
  }
}

// Close context menu on click outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.context-menu')) {
    closeContextMenu();
  }
}

// Setup selection box on pane
// We need to detect right-click on the pane to start selection box
let cleanupSelectionListener: (() => void) | null = null;

onMounted(() => {
  // Add click listener for closing context menu
  window.addEventListener('click', handleClickOutside);
  
  // Add keyboard listener for node deletion
  window.addEventListener('keydown', handleKeyboardDelete);
  
  // Find the Vue Flow pane element
  const paneElement = document.querySelector('.vue-flow__pane');
  
  if (paneElement) {
    paneElement.addEventListener('mousedown', startSelectionBox as EventListener);
    
    cleanupSelectionListener = () => {
      paneElement.removeEventListener('mousedown', startSelectionBox as EventListener);
    };
  }
});

onUnmounted(() => {
  // Remove click listener
  window.removeEventListener('click', handleClickOutside);
  
  // Remove keyboard listener
  window.removeEventListener('keydown', handleKeyboardDelete);
  
  if (cleanupSelectionListener) {
    cleanupSelectionListener();
  }
  
  // Clean up any lingering event listeners
  document.removeEventListener('mousemove', updateSelectionBox);
  document.removeEventListener('mouseup', endSelectionBox);
  document.removeEventListener('contextmenu', preventContextMenu);
});
</script>

<style scoped>
.graph-canvas {
  width: 100%;
  height: 100%;
  position: relative;
  background: #0e0e0e;
}

:deep(.vue-flow__background) {
  background-color: #0e0e0e;
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

.selection-rectangle {
  position: absolute;
  border: 2px solid rgba(74, 158, 255, 0.8);
  background: rgba(74, 158, 255, 0.15);
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(2px);
}
</style>

