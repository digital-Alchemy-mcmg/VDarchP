import {
  ArchitectureEnvelope,
  DAGEdge,
  DAGGraph,
  DAGNode,
  IngestionProposal,
  InspectorMode,
  LifecyclePhase,
  ModelStoreState,
  NodeStatus,
  NodeType,
} from '../types/dag';
import { analyzeTopology, computeDAGLayout } from '../services/dagLayout';

const STORAGE_KEY = 'spa_dag_canvas_dashboard_v1';

const DEFAULT_ENVELOPE: ArchitectureEnvelope = {
  maxLatencySlaMs: 100,
  securityEnclaveLevel: 'Confidential',
  networkEgressBudgetGb: 500,
  estimatedThroughputRps: 2500,
  resilienceTier: 'Active-Active Multi-Region',
  complianceScopes: ['SOC2 Type II', 'ISO 27001', 'PCI-DSS Tier 1'],
};

const INITIAL_GRAPH: DAGGraph = {
  id: 'dag-initial',
  title: 'Untitled Architecture DAG',
  description: 'Awaiting ingestion or initialization.',
  version: 1,
  updatedAt: new Date().toISOString(),
  isLocked: false,
  nodes: [],
  edges: [],
};

export type Listener = (state: ModelStoreState) => void;

class TransactionalModelStore {
  private state: ModelStoreState;
  private snapshot: ModelStoreState;
  private listeners: Set<Listener> = new Set();
  private isTransactionActive = false;
  private transactionSnapshot: DAGGraph | null = null;

  constructor() {
    this.state = this.loadInitialState();
    this.snapshot = structuredClone(this.state);
  }

  private loadInitialState(): ModelStoreState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.graph && Array.isArray(parsed.graph.nodes)) {
          return {
            graph: parsed.graph,
            phase: parsed.phase || (parsed.graph.isLocked ? 'P3_LOCKED_ANNOTATED' : 'P0_EMPTY'),
            selectedNodeId: null,
            hoveredNodeId: null,
            inspectorMode: parsed.inspectorMode || 'task',
            searchQuery: '',
            filterStatus: 'ALL',
            viewTransform: parsed.viewTransform || { x: 0, y: 0, zoom: 1 },
            envelope: parsed.envelope || DEFAULT_ENVELOPE,
            settings: {
              layoutDirection: parsed.settings?.layoutDirection || 'TB',
              renderEngine: parsed.settings?.renderEngine || 'svg',
              showMinimap: parsed.settings?.showMinimap ?? true,
              showGrid: parsed.settings?.showGrid ?? true,
              highContrastMode: parsed.settings?.highContrastMode ?? false,
            },
            proposal: null,
            error: null,
            history: [],
            future: [],
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load state from LocalStorage:', e);
    }

    return {
      graph: INITIAL_GRAPH,
      phase: 'P0_EMPTY',
      selectedNodeId: null,
      hoveredNodeId: null,
      inspectorMode: 'task',
      searchQuery: '',
      filterStatus: 'ALL',
      viewTransform: { x: 0, y: 0, zoom: 1 },
      envelope: DEFAULT_ENVELOPE,
      settings: {
        layoutDirection: 'TB',
        renderEngine: 'svg',
        showMinimap: true,
        showGrid: true,
        highContrastMode: false,
      },
      proposal: null,
      error: null,
      history: [],
      future: [],
    };
  }

  public getState(): ModelStoreState {
    return this.snapshot;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.persistState();
    // Never expose the mutable working state to React. Nested graph references
    // must also change so memoized canvas nodes and lineage are refreshed.
    this.snapshot = structuredClone(this.state);
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  private persistState(): void {
    try {
      const payload = {
        graph: this.state.graph,
        phase: this.state.phase,
        inspectorMode: this.state.inspectorMode,
        envelope: this.state.envelope,
        settings: this.state.settings,
        viewTransform: this.state.viewTransform,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to write to LocalStorage:', e);
    }
  }

  // --- Transactions & Invariants ---

  public beginTransaction(): void {
    if (this.isTransactionActive) {
      throw new Error('Transaction already in progress.');
    }
    this.isTransactionActive = true;
    this.transactionSnapshot = JSON.parse(JSON.stringify(this.state.graph));
  }

  public commit(): void {
    if (!this.isTransactionActive) return;
    this.isTransactionActive = false;
    this.transactionSnapshot = null;
    this.notify();
  }

  public rollback(): void {
    if (!this.isTransactionActive || !this.transactionSnapshot) return;
    this.state.graph = this.transactionSnapshot;
    this.isTransactionActive = false;
    this.transactionSnapshot = null;
    this.notify();
  }

  private pushHistory(): void {
    // Record past state for undo
    const currentClone = JSON.parse(JSON.stringify(this.state.graph));
    this.state.history = [...this.state.history.slice(-25), currentClone];
    this.state.future = [];
  }

  public undo(): void {
    if (this.state.history.length === 0) return;
    const previous = this.state.history.pop()!;
    const current = JSON.parse(JSON.stringify(this.state.graph));
    this.state.future.push(current);
    this.state.graph = previous;
    this.notify();
  }

  public redo(): void {
    if (this.state.future.length === 0) return;
    const next = this.state.future.pop()!;
    const current = JSON.parse(JSON.stringify(this.state.graph));
    this.state.history.push(current);
    this.state.graph = next;
    this.notify();
  }

  /**
   * CRITICAL FREEZE INVARIANT:
   * Structural edits (add/remove node or edge) MUST throw a hard error and be disallowed in locked state.
   */
  private assertTopologyNotFrozen(operationName: string): void {
    if (this.state.graph.isLocked || this.state.phase === 'P3_LOCKED_ANNOTATED') {
      const msg = `Freeze Invariant Violation: Structural edit '${operationName}' is strictly disallowed because graph topology is permanently frozen in Locked phase.`;
      this.state.error = msg;
      this.notify();
      throw new Error(msg);
    }
  }

  // --- Phase Lifecycle Actions ---

  private assertValidTopology(nodes: DAGNode[], edges: DAGEdge[]): void {
    const ids = nodes.map(node => node.id);
    const known = new Set(ids);
    if (known.size !== ids.length) throw new Error('Node IDs must be unique.');
    if (edges.some(edge => !known.has(edge.source) || !known.has(edge.target))) {
      throw new Error('Both edge endpoints must exist.');
    }
    if (!analyzeTopology(ids, edges).isDAG) {
      throw new Error('Cycle detected: topology must remain a DAG.');
    }
  }

  public setPhase(phase: LifecyclePhase): void {
    if (this.state.graph.isLocked && phase !== 'P3_LOCKED_ANNOTATED') {
      this.assertTopologyNotFrozen('setPhase');
    }
    this.state.phase = phase;
    this.notify();
  }

  public setProposal(proposal: IngestionProposal): void {
    this.assertTopologyNotFrozen('setProposal');
    this.state.proposal = proposal;
    this.state.phase = 'P1_INGEST';
    this.state.error = null;
    this.notify();
  }

  public acceptProposal(): void {
    if (!this.state.proposal) return;
    this.assertTopologyNotFrozen('acceptProposal');
    this.pushHistory();
    this.state.graph = JSON.parse(JSON.stringify(this.state.proposal.graph));
    this.state.phase = 'P2_CONFIRM_EDIT';
    this.state.proposal = null;
    this.notify();
  }

  /**
   * Transition to P3: Permanently lock topology forever
   */
  public lockTopologyForever(): void {
    if (this.state.graph.isLocked) return;
    this.assertValidTopology(this.state.graph.nodes, this.state.graph.edges);
    // Pre-lock history and transaction snapshots must never restore topology.
    this.state.history = [];
    this.state.future = [];
    this.isTransactionActive = false;
    this.transactionSnapshot = null;
    this.state.graph.isLocked = true;
    this.state.graph.lockedAt = new Date().toISOString();
    this.state.graph.version += 1;
    this.state.graph.updatedAt = new Date().toISOString();
    this.state.phase = 'P3_LOCKED_ANNOTATED';
    this.state.error = null;
    this.notify();
  }

  // --- Structural Operations (Disallowed when Locked) ---

  public addNode(node: Omit<DAGNode, 'position'>, position?: { x: number; y: number }): void {
    this.assertTopologyNotFrozen(`addNode(${node.id})`);

    // Ensure unique ID
    if (this.state.graph.nodes.some((n) => n.id === node.id)) {
      throw new Error(`Node with ID '${node.id}' already exists.`);
    }
    this.pushHistory();

    const newNode: DAGNode = {
      ...node,
      position: position || { x: 0, y: (this.state.graph.nodes.length + 1) * 120 },
    };

    this.state.graph.nodes.push(newNode);
    this.applyLayout();
    this.notify();
  }

  public removeNode(nodeId: string): void {
    this.assertTopologyNotFrozen(`removeNode(${nodeId})`);
    this.pushHistory();

    this.state.graph.nodes = this.state.graph.nodes.filter((n) => n.id !== nodeId);
    // Remove associated edges
    this.state.graph.edges = this.state.graph.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );

    if (this.state.selectedNodeId === nodeId) {
      this.state.selectedNodeId = null;
    }

    this.applyLayout();
    this.notify();
  }

  public updateNodeIdentity(
    nodeId: string,
    updates: { id?: string; name?: string; type?: NodeType; tier?: DAGNode['tier'] }
  ): void {
    this.assertTopologyNotFrozen(`updateNodeIdentity(${nodeId})`);

    const node = this.state.graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const oldId = node.id;
    const newId = updates.id ? updates.id.trim() : oldId;

    if (newId !== oldId) {
      if (this.state.graph.nodes.some((n) => n.id === newId)) {
        throw new Error(`ID '${newId}' already taken by another node.`);
      }
    }
    this.pushHistory();
    if (newId !== oldId) {
      node.id = newId;

      // Update edges referencing this node
      for (const edge of this.state.graph.edges) {
        if (edge.source === oldId) edge.source = newId;
        if (edge.target === oldId) edge.target = newId;
      }

      if (this.state.selectedNodeId === oldId) {
        this.state.selectedNodeId = newId;
      }
    }

    if (updates.name !== undefined) node.name = updates.name;
    if (updates.type !== undefined) node.type = updates.type;
    if (updates.tier !== undefined) node.tier = updates.tier;

    this.applyLayout();
    this.notify();
  }

  public mergeNodes(sourceId: string, targetId: string): void {
    this.assertTopologyNotFrozen(`mergeNodes(${sourceId} -> ${targetId})`);

    const sourceNode = this.state.graph.nodes.find((n) => n.id === sourceId);
    const targetNode = this.state.graph.nodes.find((n) => n.id === targetId);

    if (!sourceNode || !targetNode) {
      throw new Error('Both nodes must exist to perform merge.');
    }
    if (sourceId === targetId) throw new Error('Cannot merge a node into itself.');
    const candidateEdges = this.state.graph.edges.map(edge => ({
      ...edge,
      source: edge.source === sourceId ? targetId : edge.source,
      target: edge.target === sourceId ? targetId : edge.target,
    })).filter(edge => edge.source !== edge.target);
    this.assertValidTopology(
      this.state.graph.nodes.filter(node => node.id !== sourceId), candidateEdges
    );
    this.pushHistory();

    // Merge checklists & artifacts
    targetNode.artifacts.push(...sourceNode.artifacts);
    targetNode.requiredItems.push(...sourceNode.requiredItems);

    // Re-route inbound & outbound edges from sourceNode to targetNode
    for (const edge of this.state.graph.edges) {
      if (edge.source === sourceId) edge.source = targetId;
      if (edge.target === sourceId) edge.target = targetId;
    }

    // Remove self-referencing edges
    this.state.graph.edges = this.state.graph.edges.filter((e) => e.source !== e.target);

    // Remove duplicated edges
    const seen = new Set<string>();
    this.state.graph.edges = this.state.graph.edges.filter((e) => {
      const key = `${e.source}->${e.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Remove source node
    this.state.graph.nodes = this.state.graph.nodes.filter((n) => n.id !== sourceId);

    if (this.state.selectedNodeId === sourceId) {
      this.state.selectedNodeId = targetId;
    }

    this.applyLayout();
    this.notify();
  }

  public addEdge(edge: Omit<DAGEdge, 'id'>): void {
    this.assertTopologyNotFrozen(`addEdge(${edge.source} -> ${edge.target})`);

    if (edge.source === edge.target) {
      throw new Error('Self-referencing loops are invalid in a DAG.');
    }

    const existing = this.state.graph.edges.find(
      (e) => e.source === edge.source && e.target === edge.target
    );
    if (existing) {
      throw new Error('Edge already exists.');
    }
    this.assertValidTopology(this.state.graph.nodes, [
      ...this.state.graph.edges, { id: 'candidate', ...edge },
    ]);
    this.pushHistory();

    const newEdge: DAGEdge = {
      id: `edge-${edge.source}-${edge.target}`.toLowerCase(),
      ...edge,
    };

    this.state.graph.edges.push(newEdge);
    this.applyLayout();
    this.notify();
  }

  public removeEdge(edgeId: string): void {
    this.assertTopologyNotFrozen(`removeEdge(${edgeId})`);
    this.pushHistory();

    this.state.graph.edges = this.state.graph.edges.filter((e) => e.id !== edgeId);
    this.applyLayout();
    this.notify();
  }

  // --- Non-Structural Deep Annotations (PERMITTED in P3) ---

  public updateNodeAnnotation(
    nodeId: string,
    updater: (node: DAGNode) => void
  ): void {
    const node = this.state.graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    this.pushHistory();

    updater(node);
    this.state.graph.updatedAt = new Date().toISOString();
    this.notify();
  }

  public updateNodeStatus(nodeId: string, status: NodeStatus): void {
    this.updateNodeAnnotation(nodeId, (node) => {
      node.status = status;
    });
  }

  public addArtifactLink(nodeId: string, artifact: Omit<DAGNode['artifacts'][0], 'id'>): void {
    this.updateNodeAnnotation(nodeId, (node) => {
      node.artifacts.push({
        id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...artifact,
      });
    });
  }

  public removeArtifactLink(nodeId: string, artifactId: string): void {
    this.updateNodeAnnotation(nodeId, (node) => {
      node.artifacts = node.artifacts.filter((a) => a.id !== artifactId);
    });
  }

  public addRequiredItem(nodeId: string, title: string, category: DAGNode['requiredItems'][0]['category']): void {
    this.updateNodeAnnotation(nodeId, (node) => {
      node.requiredItems.push({
        id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        completed: false,
        category,
      });
    });
  }

  public toggleRequiredItem(nodeId: string, itemId: string): void {
    this.updateNodeAnnotation(nodeId, (node) => {
      const item = node.requiredItems.find((i) => i.id === itemId);
      if (item) {
        item.completed = !item.completed;
      }
    });
  }

  public removeRequiredItem(nodeId: string, itemId: string): void {
    this.updateNodeAnnotation(nodeId, (node) => {
      node.requiredItems = node.requiredItems.filter((i) => i.id !== itemId);
    });
  }

  /**
   * Junction Schema upload & validation (max 256KB constraint)
   */
  public uploadJunctionSchema(
    nodeId: string,
    schemaFile: { name: string; content: string; format?: 'json' | 'yaml' | 'protobuf' | 'text' }
  ): void {
    const sizeBytes = new Blob([schemaFile.content]).size;
    const MAX_BYTES = 256 * 1024; // 256KB

    if (sizeBytes > MAX_BYTES) {
      throw new Error(`Schema file exceeds maximum limit of 256KB (${(sizeBytes / 1024).toFixed(1)} KB).`);
    }

    this.updateNodeAnnotation(nodeId, (node) => {
      node.junctionSchema = {
        name: schemaFile.name,
        content: schemaFile.content,
        sizeBytes,
        format: schemaFile.format || 'json',
        lastModified: new Date().toISOString(),
      };
    });
  }

  public removeJunctionSchema(nodeId: string): void {
    this.updateNodeAnnotation(nodeId, (node) => {
      delete node.junctionSchema;
    });
  }

  public updateProvenance(nodeId: string, provenance: Partial<DAGNode['provenance']>): void {
    this.updateNodeAnnotation(nodeId, (node) => {
      node.provenance = {
        ...node.provenance,
        ...provenance,
      };
    });
  }

  // --- Viewport & UI State Actions ---

  public setSelectedNode(nodeId: string | null): void {
    this.state.selectedNodeId = nodeId;
    this.notify();
  }

  public setHoveredNode(nodeId: string | null): void {
    this.state.hoveredNodeId = nodeId;
    this.notify();
  }

  public setInspectorMode(mode: InspectorMode): void {
    this.state.inspectorMode = mode;
    this.notify();
  }

  public setSearchQuery(query: string): void {
    this.state.searchQuery = query;
    this.notify();
  }

  public setFilterStatus(status: string): void {
    this.state.filterStatus = status;
    this.notify();
  }

  public setViewTransform(transform: { x: number; y: number; zoom: number }): void {
    this.state.viewTransform = transform;
    this.notify();
  }

  public updateNodePosition(nodeId: string, position: { x: number; y: number }): void {
    const node = this.state.graph.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.position = position;
      this.notify();
    }
  }

  public updateEnvelope(updates: Partial<ArchitectureEnvelope>): void {
    this.state.envelope = {
      ...this.state.envelope,
      ...updates,
    };
    this.notify();
  }

  public updateSettings(updates: Partial<ModelStoreState['settings']>): void {
    const previousDirection = this.state.settings.layoutDirection;
    this.state.settings = {
      ...this.state.settings,
      ...updates,
    };
    if (this.state.settings.layoutDirection !== previousDirection) {
      this.applyLayout();
    }
    this.notify();
  }

  public recomputeLayout(): void {
    this.applyLayout();
    this.notify();
  }

  private applyLayout(): void {
    const res = computeDAGLayout(
      this.state.graph.nodes,
      this.state.graph.edges,
      { direction: this.state.settings.layoutDirection }
    );
    this.state.graph.nodes = res.nodes;
    this.state.graph.edges = res.edges;
  }

  public resetToEmpty(): void {
    this.pushHistory();
    this.state.graph = {
      id: `dag-${Date.now()}`,
      title: 'New Architecture DAG',
      description: 'Ready for ingestion.',
      version: 1,
      updatedAt: new Date().toISOString(),
      isLocked: false,
      nodes: [],
      edges: [],
    };
    this.state.phase = 'P0_EMPTY';
    this.state.proposal = null;
    this.state.selectedNodeId = null;
    this.state.error = null;
    this.notify();
  }

  public clearError(): void {
    this.state.error = null;
    this.notify();
  }
}

export const modelStore = new TransactionalModelStore();
