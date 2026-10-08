/**
 * DAG Canvas Dashboard - Core Domain Types
 */

export type LifecyclePhase = 'P0_EMPTY' | 'P1_INGEST' | 'P2_CONFIRM_EDIT' | 'P3_LOCKED_ANNOTATED';

export type NodeType = 'component' | 'junction' | 'service' | 'datastore' | 'gateway' | 'external';

export type NodeStatus = 'DRAFT' | 'IN_PROGRESS' | 'BLOCKED' | 'VERIFIED' | 'COMPLETE';

export type InspectorMode = 'envelope' | 'task';

export type ArtifactType = 'repository' | 'openapi' | 'protobuf' | 'figma' | 'docker' | 'runbook' | 'doc';

export interface ArtifactLink {
  id: string;
  title: string;
  url: string;
  type: ArtifactType;
}

export interface RequiredItem {
  id: string;
  title: string;
  completed: boolean;
  category: 'architecture' | 'security' | 'testing' | 'documentation' | 'infrastructure';
  assignedTo?: string;
  notes?: string;
}

export interface JunctionSchema {
  name: string;
  content: string;
  sizeBytes: number;
  format: 'json' | 'yaml' | 'protobuf' | 'text';
  lastModified: string;
}

export interface DependencyProvenance {
  interfaceContract?: string;
  protocol?: string;
  sla?: string;
  payloadFormat?: string;
  notes?: string;
}

export interface DAGNode {
  id: string; // High-density monospace ID e.g. COMP-AUTH-01
  name: string;
  type: NodeType;
  description: string;
  tier: 'edge' | 'ingress' | 'core' | 'storage' | 'external';
  status: NodeStatus;
  artifacts: ArtifactLink[];
  requiredItems: RequiredItem[];
  junctionSchema?: JunctionSchema;
  provenance: DependencyProvenance;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  layer?: number;
}

export interface DAGEdge {
  id: string;
  source: string; // Source Node ID
  target: string; // Target Node ID
  label?: string;
  protocol?: string;
  schemaRef?: string;
}

export interface DAGGraph {
  id: string;
  title: string;
  description: string;
  version: number;
  updatedAt: string;
  isLocked: boolean;
  lockedAt?: string;
  nodes: DAGNode[];
  edges: DAGEdge[];
  rawSource?: string;
  sourceType?: 'mermaid' | 'markdown' | 'text';
}

export interface IngestionProposal {
  graph: DAGGraph;
  confidence: number;
  summary: {
    componentCount: number;
    junctionCount: number;
    edgeCount: number;
    detectedTiers: string[];
    potentialIssues: string[];
  };
}

export interface ArchitectureEnvelope {
  maxLatencySlaMs: number;
  securityEnclaveLevel: 'Standard' | 'Restricted' | 'Confidential' | 'Air-Gapped';
  networkEgressBudgetGb: number;
  estimatedThroughputRps: number;
  resilienceTier: 'N+1' | 'Active-Active Multi-Region' | 'Zone-Redundant';
  complianceScopes: string[];
}

export interface ModelStoreState {
  graph: DAGGraph;
  phase: LifecyclePhase;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  inspectorMode: InspectorMode;
  searchQuery: string;
  filterStatus: string;
  viewTransform: { x: number; y: number; zoom: number };
  envelope: ArchitectureEnvelope;
  settings: {
    layoutDirection: 'TB' | 'LR';
    renderEngine: 'svg' | 'canvas';
    showMinimap: boolean;
    showGrid: boolean;
    highContrastMode: boolean;
  };
  proposal: IngestionProposal | null;
  error: string | null;
  history: DAGGraph[];
  future: DAGGraph[];
}
