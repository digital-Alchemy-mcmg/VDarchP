import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertOctagon,
  ShieldCheck,
  FileCode,
  Link2,
  Plus,
  Trash2,
  ExternalLink,
  Upload,
  Layers,
  ArrowDown,
  ArrowUp,
  X,
  Sliders,
  CheckSquare,
  Shield,
  Activity,
  AlertTriangle,
  Download,
  Lock,
} from 'lucide-react';
import {
  ArtifactLink,
  ArtifactType,
  DAGNode,
  ModelStoreState,
  NodeStatus,
  RequiredItem,
} from '../../types/dag';
import { modelStore } from '../../store/ModelStore';
import { analyzeTopology } from '../../services/dagLayout';

interface LowerInspectorProps {
  state: ModelStoreState;
}

export const LowerInspector: React.FC<LowerInspectorProps> = ({ state }) => {
  const { graph, selectedNodeId, inspectorMode, envelope } = state;
  const isLocked = graph.isLocked;

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId);

  // New Artifact form state
  const [showAddArtifact, setShowAddArtifact] = useState(false);
  const [artTitle, setArtTitle] = useState('');
  const [artUrl, setArtUrl] = useState('');
  const [artType, setArtType] = useState<ArtifactType>('repository');

  // New Checklist Item state
  const [showAddReq, setShowAddReq] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState<RequiredItem['category']>('architecture');

  // Schema Upload state
  const schemaFileInputRef = useRef<HTMLInputElement>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [editingSchemaDirectly, setEditingSchemaDirectly] = useState(false);
  const [schemaTextBuffer, setSchemaTextBuffer] = useState('');

  // Topology Analysis
  const topology = analyzeTopology(
    graph.nodes.map((n) => n.id),
    graph.edges
  );

  // Architecture Completion metrics
  let totalChecklistItems = 0;
  let completedChecklistItems = 0;
  let verifiedNodesCount = 0;
  let missingItemsCount = 0;

  for (const node of graph.nodes) {
    if (node.status === 'VERIFIED' || node.status === 'COMPLETE') {
      verifiedNodesCount++;
    } else {
      missingItemsCount++;
    }

    if (node.type === 'junction' && !node.junctionSchema) {
      missingItemsCount++;
    }

    for (const item of node.requiredItems) {
      totalChecklistItems++;
      if (item.completed) {
        completedChecklistItems++;
      } else {
        missingItemsCount++;
      }
    }
  }

  const checklistPct =
    totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 100;
  const nodeVerificationPct =
    graph.nodes.length > 0 ? Math.round((verifiedNodesCount / graph.nodes.length) * 100) : 100;
  const overallCompletionPct = Math.round(0.5 * checklistPct + 0.5 * nodeVerificationPct);

  // Schema File Upload handler (Max 256KB constraint)
  const handleSchemaFileUpload = (file: File) => {
    if (!selectedNode) return;
    setSchemaError(null);

    const MAX_BYTES = 256 * 1024; // 256KB
    if (file.size > MAX_BYTES) {
      setSchemaError(
        `File size ${(file.size / 1024).toFixed(1)} KB exceeds maximum allowed limit of 256 KB.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        modelStore.uploadJunctionSchema(selectedNode.id, {
          name: file.name,
          content,
          format: file.name.endsWith('.yaml') || file.name.endsWith('.yml') ? 'yaml' : 'json',
        });
      } catch (err: any) {
        setSchemaError(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateArtifact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !artTitle.trim() || !artUrl.trim()) return;

    modelStore.addArtifactLink(selectedNode.id, {
      title: artTitle.trim(),
      url: artUrl.trim(),
      type: artType,
    });

    setArtTitle('');
    setArtUrl('');
    setShowAddArtifact(false);
  };

  const handleCreateRequiredItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !reqTitle.trim()) return;

    modelStore.addRequiredItem(selectedNode.id, reqTitle.trim(), reqCategory);
    setReqTitle('');
    setShowAddReq(false);
  };

  return (
    <aside aria-label="Architecture Inspector" className="h-full border-t border-slate-800 bg-slate-950/95 backdrop-blur-md flex flex-col text-slate-100 overflow-hidden select-none">
      {/* ========================================================================= */}
      {/* CASE A: UNSELECTED VIEW - GLOBAL ARCHITECTURE COMPLETION & DEPENDENCIES */}
      {/* ========================================================================= */}
      {!selectedNode ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Bar with Mode Switcher & Global Metrics */}
          <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-slate-900/60">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Global System Architecture</span>
              </span>

              {/* Mode Switcher: Task Mode vs Envelope Mode */}
              <div className="bg-slate-950 border border-slate-800 p-0.5 rounded-md flex space-x-1 ml-2">
                <button
                  onClick={() => modelStore.setInspectorMode('task')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    inspectorMode === 'task'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Task Execution</span>
                </button>
                <button
                  onClick={() => modelStore.setInspectorMode('envelope')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    inspectorMode === 'envelope'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Architecture Envelope</span>
                </button>
              </div>
            </div>

            {/* Quick Completion Pill */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400">System Completion:</span>
                <span className="font-mono text-xs font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                  {overallCompletionPct}%
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400">Missing Items:</span>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                    missingItemsCount > 0
                      ? 'bg-amber-950/60 border border-amber-800/60 text-amber-300'
                      : 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                  }`}
                >
                  {missingItemsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {inspectorMode === 'task' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Panel 1: Progress Metrics */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase mb-3 flex items-center justify-between">
                    <span>Architecture Verification</span>
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  </h3>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Checklists Completed</span>
                        <span>
                          {completedChecklistItems}/{totalChecklistItems} ({checklistPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                          style={{ width: `${checklistPct}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Nodes Verified / Complete</span>
                        <span>
                          {verifiedNodesCount}/{graph.nodes.length} ({nodeVerificationPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${nodeVerificationPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 mt-2 text-[11px] text-slate-400 space-y-1">
                      <div className="text-slate-300 font-semibold">Topology Invariant:</div>
                      <div>
                        State:{' '}
                        <span className={isLocked ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                          {isLocked ? 'LOCKED_FROZEN_FOREVER' : 'UNLOCKED_MUTABLE'}
                        </span>
                      </div>
                      <div>
                        DAG Invariant:{' '}
                        <span className={topology.isDAG ? 'text-emerald-400' : 'text-rose-400'}>
                          {topology.isDAG ? 'VERIFIED_ACIRCULAR' : 'CYCLE_DETECTED'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Global Dependency Tracker */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 md:col-span-2">
                  <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase mb-3 flex items-center justify-between">
                    <span>Global Topological Execution Sequence</span>
                    <span className="text-[11px] text-cyan-400 font-normal">
                      Kahn Resolvability ({topology.topologicalOrder.length} nodes)
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {topology.topologicalOrder.map((nodeId, idx) => {
                      const n = graph.nodes.find((item) => item.id === nodeId);
                      return (
                        <div
                          key={nodeId}
                          onClick={() => modelStore.setSelectedNode(nodeId)}
                          className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/50 cursor-pointer flex items-center justify-between text-xs font-mono transition-colors"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="text-[10px] text-slate-500 w-4">{idx + 1}.</span>
                            <span className="text-cyan-300 font-semibold truncate">{nodeId}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {n?.status || 'DRAFT'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Envelope Mode Settings */
              <div className="max-w-4xl mx-auto bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>System Architecture Operational Envelope</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mb-6">
                  Set high-level operational envelopes, SLAs, and security boundary guarantees.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Max Latency SLA (ms)
                    </label>
                    <input
                      type="number"
                      value={envelope.maxLatencySlaMs}
                      onChange={(e) =>
                        modelStore.updateEnvelope({ maxLatencySlaMs: Number(e.target.value) || 50 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Throughput Budget (RPS)
                    </label>
                    <input
                      type="number"
                      value={envelope.estimatedThroughputRps}
                      onChange={(e) =>
                        modelStore.updateEnvelope({
                          estimatedThroughputRps: Number(e.target.value) || 1000,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Monthly Egress Allocation (GB)
                    </label>
                    <input
                      type="number"
                      value={envelope.networkEgressBudgetGb}
                      onChange={(e) =>
                        modelStore.updateEnvelope({
                          networkEgressBudgetGb: Number(e.target.value) || 100,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Security Enclave Level
                    </label>
                    <select
                      value={envelope.securityEnclaveLevel}
                      onChange={(e) =>
                        modelStore.updateEnvelope({
                          securityEnclaveLevel: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Restricted">Restricted</option>
                      <option value="Confidential">Confidential Enclave</option>
                      <option value="Air-Gapped">Air-Gapped Sovereign</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Resilience Tier
                    </label>
                    <select
                      value={envelope.resilienceTier}
                      onChange={(e) =>
                        modelStore.updateEnvelope({
                          resilienceTier: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="N+1">N+1 Failover</option>
                      <option value="Zone-Redundant">Zone-Redundant High Availability</option>
                      <option value="Active-Active Multi-Region">
                        Active-Active Multi-Region Synchronous
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Compliance Standards
                    </label>
                    <div className="text-xs font-mono text-cyan-300 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                      SOC2, ISO 27001, PCI-DSS
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CASE B: SELECTED NODE DEEP ANNOTATION INSPECTOR */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header for Selected Node */}
          <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-slate-900/80">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {selectedNode.id}
              </span>
              <span className="text-sm font-bold text-white tracking-tight">{selectedNode.name}</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {selectedNode.type}
              </span>
              <span className="text-[10px] font-mono text-slate-400">tier: {selectedNode.tier}</span>
            </div>

            <div className="flex items-center space-x-3">
              {/* Status Selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-mono text-slate-400">Status:</span>
                <select
                  value={selectedNode.status}
                  onChange={(e) => modelStore.updateNodeStatus(selectedNode.id, e.target.value as NodeStatus)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="COMPLETE">COMPLETE</option>
                </select>
              </div>

              {/* Close / Deselect */}
              <button
                onClick={() => modelStore.setSelectedNode(null)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Deselect Node"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Deep Annotation Tabs / Columns */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Column 1: Required Items Checklist */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-mono font-semibold text-slate-200 uppercase flex items-center space-x-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Required Items ({selectedNode.requiredItems.length})</span>
                </span>
                <button
                  onClick={() => setShowAddReq(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              {/* Checklist Form Drawer */}
              {showAddReq && (
                <form onSubmit={handleCreateRequiredItem} className="p-2.5 mb-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <input
                    type="text"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="Checklist requirement title..."
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <div className="flex justify-between items-center">
                    <select
                      value={reqCategory}
                      onChange={(e) => setReqCategory(e.target.value as any)}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300"
                    >
                      <option value="architecture">Architecture</option>
                      <option value="security">Security</option>
                      <option value="testing">Testing</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="documentation">Documentation</option>
                    </select>
                    <div className="space-x-1">
                      <button
                        type="button"
                        onClick={() => setShowAddReq(false)}
                        className="px-2 py-0.5 text-slate-400 hover:text-white text-[11px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Items List */}
              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-56 pr-1">
                {selectedNode.requiredItems.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 font-mono">
                    No checklists attached yet.
                  </div>
                ) : (
                  selectedNode.requiredItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start justify-between text-xs group"
                    >
                      <label className="flex items-start space-x-2 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => modelStore.toggleRequiredItem(selectedNode.id, item.id)}
                          className="mt-0.5 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div>
                          <div
                            className={`${
                              item.completed ? 'line-through text-slate-500' : 'text-slate-200'
                            }`}
                          >
                            {item.title}
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 uppercase">
                            {item.category}
                          </span>
                        </div>
                      </label>
                      <button
                        onClick={() => modelStore.removeRequiredItem(selectedNode.id, item.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete checklist item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Linked Artifacts */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-mono font-semibold text-slate-200 uppercase flex items-center space-x-1.5">
                  <Link2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Artifact Links ({selectedNode.artifacts.length})</span>
                </span>
                <button
                  onClick={() => setShowAddArtifact(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Link</span>
                </button>
              </div>

              {/* Add Artifact Drawer */}
              {showAddArtifact && (
                <form onSubmit={handleCreateArtifact} className="p-2.5 mb-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <input
                    type="text"
                    value={artTitle}
                    onChange={(e) => setArtTitle(e.target.value)}
                    placeholder="Artifact title (e.g. GitHub Repository)"
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="url"
                    value={artUrl}
                    onChange={(e) => setArtUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <div className="flex justify-between items-center">
                    <select
                      value={artType}
                      onChange={(e) => setArtType(e.target.value as ArtifactType)}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300"
                    >
                      <option value="repository">Repository</option>
                      <option value="openapi">OpenAPI Spec</option>
                      <option value="protobuf">Protobuf</option>
                      <option value="figma">Figma</option>
                      <option value="docker">Docker Image</option>
                      <option value="runbook">Runbook</option>
                      <option value="doc">Documentation</option>
                    </select>
                    <div className="space-x-1">
                      <button
                        type="button"
                        onClick={() => setShowAddArtifact(false)}
                        className="px-2 py-0.5 text-slate-400 hover:text-white text-[11px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Artifacts List */}
              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-56 pr-1">
                {selectedNode.artifacts.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 font-mono">
                    No artifacts linked yet.
                  </div>
                ) : (
                  selectedNode.artifacts.map((art) => (
                    <div
                      key={art.id}
                      className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs group"
                    >
                      <div className="truncate flex-1 pr-2">
                        <div className="font-medium text-slate-200 truncate">{art.title}</div>
                        <a
                          href={art.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1 font-mono truncate"
                        >
                          <span className="truncate">{art.url}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      </div>
                      <button
                        onClick={() => modelStore.removeArtifactLink(selectedNode.id, art.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove artifact"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Junction Schema Uploader & Editor (Max 256KB constraint) */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                <span className="text-xs font-mono font-semibold text-slate-200 uppercase flex items-center space-x-1.5">
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Junction Schema (max 256KB)</span>
                </span>
                <input
                  ref={schemaFileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml,.proto,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSchemaFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <button
                  onClick={() => schemaFileInputRef.current?.click()}
                  className="text-xs text-amber-400 hover:text-amber-300 font-mono flex items-center space-x-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
              </div>

              {/* Schema Error */}
              {schemaError && (
                <div className="p-2 mb-2 rounded bg-rose-950/50 border border-rose-800/50 text-rose-300 text-[11px] font-mono">
                  {schemaError}
                </div>
              )}

              {/* Schema Content display */}
              {selectedNode.junctionSchema ? (
                <div className="flex-1 flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-amber-300 font-semibold truncate">
                      {selectedNode.junctionSchema.name}
                    </span>
                    <span className="text-slate-500">
                      {(selectedNode.junctionSchema.sizeBytes / 1024).toFixed(1)} KB / 256 KB
                    </span>
                  </div>

                  {editingSchemaDirectly ? (
                    <div className="flex-1 flex flex-col space-y-1">
                      <textarea
                        value={schemaTextBuffer}
                        onChange={(e) => setSchemaTextBuffer(e.target.value)}
                        rows={6}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => setEditingSchemaDirectly(false)}
                          className="px-2 py-0.5 text-xs text-slate-400"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            try {
                              modelStore.uploadJunctionSchema(selectedNode.id, {
                                name: selectedNode.junctionSchema!.name,
                                content: schemaTextBuffer,
                                format: selectedNode.junctionSchema!.format,
                              });
                              setEditingSchemaDirectly(false);
                            } catch (err: any) {
                              setSchemaError(err.message);
                            }
                          }}
                          className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <pre className="flex-1 bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-36">
                      {selectedNode.junctionSchema.content.substring(0, 500)}
                      {selectedNode.junctionSchema.content.length > 500 ? '...' : ''}
                    </pre>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        setSchemaTextBuffer(selectedNode.junctionSchema!.content);
                        setEditingSchemaDirectly(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-white font-mono"
                    >
                      Edit Schema
                    </button>
                    <button
                      onClick={() => modelStore.removeJunctionSchema(selectedNode.id)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-mono"
                    >
                      Delete Schema
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg p-4 text-center">
                  <FileCode className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400 font-mono mb-2">No schema payload attached.</p>
                  <button
                    onClick={() => schemaFileInputRef.current?.click()}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-xs font-mono text-amber-300"
                  >
                    Upload Schema (≤256KB)
                  </button>
                </div>
              )}
            </div>

            {/* Column 4: Dependency Provenance */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-mono font-semibold text-slate-200 uppercase flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dependency Provenance</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Inbound / Outbound</span>
              </div>

              <div className="space-y-3 font-mono text-xs flex-1 overflow-y-auto max-h-56 pr-1">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Interface Contract</label>
                  <input
                    type="text"
                    value={selectedNode.provenance.interfaceContract || ''}
                    onChange={(e) =>
                      modelStore.updateProvenance(selectedNode.id, { interfaceContract: e.target.value })
                    }
                    placeholder="e.g. gRPC / Protobuf v3"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Network Protocol & Auth</label>
                  <input
                    type="text"
                    value={selectedNode.provenance.protocol || ''}
                    onChange={(e) =>
                      modelStore.updateProvenance(selectedNode.id, { protocol: e.target.value })
                    }
                    placeholder="e.g. HTTPS / TLS 1.3 / OAuth2"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Latency SLA Target</label>
                  <input
                    type="text"
                    value={selectedNode.provenance.sla || ''}
                    onChange={(e) =>
                      modelStore.updateProvenance(selectedNode.id, { sla: e.target.value })
                    }
                    placeholder="e.g. p99 < 15ms"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Upstream & Downstream wiring summary */}
                <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Upstream Sources:</span>
                    <span className="text-cyan-400">
                      {graph.edges.filter((e) => e.target === selectedNode.id).length} sources
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Downstream Sinks:</span>
                    <span className="text-amber-400">
                      {graph.edges.filter((e) => e.source === selectedNode.id).length} dependents
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
